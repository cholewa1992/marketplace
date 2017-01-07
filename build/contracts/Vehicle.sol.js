var Web3 = require("web3");
var SolidityEvent = require("web3/lib/web3/event.js");

(function() {
  // Planned for future features, logging, etc.
  function Provider(provider) {
    this.provider = provider;
  }

  Provider.prototype.send = function() {
    this.provider.send.apply(this.provider, arguments);
  };

  Provider.prototype.sendAsync = function() {
    this.provider.sendAsync.apply(this.provider, arguments);
  };

  var BigNumber = (new Web3()).toBigNumber(0).constructor;

  var Utils = {
    is_object: function(val) {
      return typeof val == "object" && !Array.isArray(val);
    },
    is_big_number: function(val) {
      if (typeof val != "object") return false;

      // Instanceof won't work because we have multiple versions of Web3.
      try {
        new BigNumber(val);
        return true;
      } catch (e) {
        return false;
      }
    },
    merge: function() {
      var merged = {};
      var args = Array.prototype.slice.call(arguments);

      for (var i = 0; i < args.length; i++) {
        var object = args[i];
        var keys = Object.keys(object);
        for (var j = 0; j < keys.length; j++) {
          var key = keys[j];
          var value = object[key];
          merged[key] = value;
        }
      }

      return merged;
    },
    promisifyFunction: function(fn, C) {
      var self = this;
      return function() {
        var instance = this;

        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {
          var callback = function(error, result) {
            if (error != null) {
              reject(error);
            } else {
              accept(result);
            }
          };
          args.push(tx_params, callback);
          fn.apply(instance.contract, args);
        });
      };
    },
    synchronizeFunction: function(fn, instance, C) {
      var self = this;
      return function() {
        var args = Array.prototype.slice.call(arguments);
        var tx_params = {};
        var last_arg = args[args.length - 1];

        // It's only tx_params if it's an object and not a BigNumber.
        if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
          tx_params = args.pop();
        }

        tx_params = Utils.merge(C.class_defaults, tx_params);

        return new Promise(function(accept, reject) {

          var decodeLogs = function(logs) {
            return logs.map(function(log) {
              var logABI = C.events[log.topics[0]];

              if (logABI == null) {
                return null;
              }

              var decoder = new SolidityEvent(null, logABI, instance.address);
              return decoder.decode(log);
            }).filter(function(log) {
              return log != null;
            });
          };

          var callback = function(error, tx) {
            if (error != null) {
              reject(error);
              return;
            }

            var timeout = C.synchronization_timeout || 240000;
            var start = new Date().getTime();

            var make_attempt = function() {
              C.web3.eth.getTransactionReceipt(tx, function(err, receipt) {
                if (err) return reject(err);

                if (receipt != null) {
                  // If they've opted into next gen, return more information.
                  if (C.next_gen == true) {
                    return accept({
                      tx: tx,
                      receipt: receipt,
                      logs: decodeLogs(receipt.logs)
                    });
                  } else {
                    return accept(tx);
                  }
                }

                if (timeout > 0 && new Date().getTime() - start > timeout) {
                  return reject(new Error("Transaction " + tx + " wasn't processed in " + (timeout / 1000) + " seconds!"));
                }

                setTimeout(make_attempt, 1000);
              });
            };

            make_attempt();
          };

          args.push(tx_params, callback);
          fn.apply(self, args);
        });
      };
    }
  };

  function instantiate(instance, contract) {
    instance.contract = contract;
    var constructor = instance.constructor;

    // Provision our functions.
    for (var i = 0; i < instance.abi.length; i++) {
      var item = instance.abi[i];
      if (item.type == "function") {
        if (item.constant == true) {
          instance[item.name] = Utils.promisifyFunction(contract[item.name], constructor);
        } else {
          instance[item.name] = Utils.synchronizeFunction(contract[item.name], instance, constructor);
        }

        instance[item.name].call = Utils.promisifyFunction(contract[item.name].call, constructor);
        instance[item.name].sendTransaction = Utils.promisifyFunction(contract[item.name].sendTransaction, constructor);
        instance[item.name].request = contract[item.name].request;
        instance[item.name].estimateGas = Utils.promisifyFunction(contract[item.name].estimateGas, constructor);
      }

      if (item.type == "event") {
        instance[item.name] = contract[item.name];
      }
    }

    instance.allEvents = contract.allEvents;
    instance.address = contract.address;
    instance.transactionHash = contract.transactionHash;
  };

  // Use inheritance to create a clone of this contract,
  // and copy over contract's static functions.
  function mutate(fn) {
    var temp = function Clone() { return fn.apply(this, arguments); };

    Object.keys(fn).forEach(function(key) {
      temp[key] = fn[key];
    });

    temp.prototype = Object.create(fn.prototype);
    bootstrap(temp);
    return temp;
  };

  function bootstrap(fn) {
    fn.web3 = new Web3();
    fn.class_defaults  = fn.prototype.defaults || {};

    // Set the network iniitally to make default data available and re-use code.
    // Then remove the saved network id so the network will be auto-detected on first use.
    fn.setNetwork("default");
    fn.network_id = null;
    return fn;
  };

  // Accepts a contract object created with web3.eth.contract.
  // Optionally, if called without `new`, accepts a network_id and will
  // create a new version of the contract abstraction with that network_id set.
  function Contract() {
    if (this instanceof Contract) {
      instantiate(this, arguments[0]);
    } else {
      var C = mutate(Contract);
      var network_id = arguments.length > 0 ? arguments[0] : "default";
      C.setNetwork(network_id);
      return C;
    }
  };

  Contract.currentProvider = null;

  Contract.setProvider = function(provider) {
    var wrapped = new Provider(provider);
    this.web3.setProvider(wrapped);
    this.currentProvider = provider;
  };

  Contract.new = function() {
    if (this.currentProvider == null) {
      throw new Error("Vehicle error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("Vehicle error: contract binary not set. Can't deploy new instance.");
    }

    var regex = /__[^_]+_+/g;
    var unlinked_libraries = this.binary.match(regex);

    if (unlinked_libraries != null) {
      unlinked_libraries = unlinked_libraries.map(function(name) {
        // Remove underscores
        return name.replace(/_/g, "");
      }).sort().filter(function(name, index, arr) {
        // Remove duplicates
        if (index + 1 >= arr.length) {
          return true;
        }

        return name != arr[index + 1];
      }).join(", ");

      throw new Error("Vehicle contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of Vehicle: " + unlinked_libraries);
    }

    var self = this;

    return new Promise(function(accept, reject) {
      var contract_class = self.web3.eth.contract(self.abi);
      var tx_params = {};
      var last_arg = args[args.length - 1];

      // It's only tx_params if it's an object and not a BigNumber.
      if (Utils.is_object(last_arg) && !Utils.is_big_number(last_arg)) {
        tx_params = args.pop();
      }

      tx_params = Utils.merge(self.class_defaults, tx_params);

      if (tx_params.data == null) {
        tx_params.data = self.binary;
      }

      // web3 0.9.0 and above calls new twice this callback twice.
      // Why, I have no idea...
      var intermediary = function(err, web3_instance) {
        if (err != null) {
          reject(err);
          return;
        }

        if (err == null && web3_instance != null && web3_instance.address != null) {
          accept(new self(web3_instance));
        }
      };

      args.push(tx_params, intermediary);
      contract_class.new.apply(contract_class, args);
    });
  };

  Contract.at = function(address) {
    if (address == null || typeof address != "string" || address.length != 42) {
      throw new Error("Invalid address passed to Vehicle.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: Vehicle not deployed or address not set.");
    }

    return this.at(this.address);
  };

  Contract.defaults = function(class_defaults) {
    if (this.class_defaults == null) {
      this.class_defaults = {};
    }

    if (class_defaults == null) {
      class_defaults = {};
    }

    var self = this;
    Object.keys(class_defaults).forEach(function(key) {
      var value = class_defaults[key];
      self.class_defaults[key] = value;
    });

    return this.class_defaults;
  };

  Contract.extend = function() {
    var args = Array.prototype.slice.call(arguments);

    for (var i = 0; i < arguments.length; i++) {
      var object = arguments[i];
      var keys = Object.keys(object);
      for (var j = 0; j < keys.length; j++) {
        var key = keys[j];
        var value = object[key];
        this.prototype[key] = value;
      }
    }
  };

  Contract.all_networks = {
  "default": {
    "abi": [
      {
        "constant": true,
        "inputs": [],
        "name": "model",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "issuer",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "brand",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_seller",
            "type": "address"
          }
        ],
        "name": "authorizeSeller",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "owner",
        "outputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "vin",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [
          {
            "name": "_seller",
            "type": "address"
          }
        ],
        "name": "isAuthorizedToSell",
        "outputs": [
          {
            "name": "success",
            "type": "bool"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "color",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_newOwner",
            "type": "address"
          }
        ],
        "name": "transferOwnership",
        "outputs": [],
        "payable": false,
        "type": "function"
      },
      {
        "constant": true,
        "inputs": [],
        "name": "year",
        "outputs": [
          {
            "name": "",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "inputs": [
          {
            "name": "_vin",
            "type": "string"
          },
          {
            "name": "_brand",
            "type": "string"
          },
          {
            "name": "_model",
            "type": "string"
          },
          {
            "name": "_year",
            "type": "string"
          },
          {
            "name": "_color",
            "type": "string"
          }
        ],
        "payable": false,
        "type": "constructor"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "addr",
            "type": "address"
          }
        ],
        "name": "SellerWasAuthorized",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x606060405234620000005760405162000bdd38038062000bdd83398101604090815281516020830151918301516060840151608085015192850194938401939182019290820191015b5b60008054600160a060020a03191633600160a060020a03161790555b60038054600160a060020a03191633600160a060020a0316179055845160028054600082905290917f405787fa12a823e0f2b7631cc41b3ba8828b3321ca811111fa75cd3aa3bb5ace602061010060018516150260001901909316849004601f9081018490048201938a0190839010620000eb57805160ff19168380011785556200011b565b828001600101855582156200011b579182015b828111156200011b578251825591602001919060010190620000fe565b5b506200013f9291505b808211156200013b576000815560010162000125565b5090565b50508360049080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106200018f57805160ff1916838001178555620001bf565b82800160010185558215620001bf579182015b82811115620001bf578251825591602001919060010190620001a2565b5b50620001e39291505b808211156200013b576000815560010162000125565b5090565b50508260059080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106200023357805160ff191683800117855562000263565b8280016001018555821562000263579182015b828111156200026357825182559160200191906001019062000246565b5b50620002879291505b808211156200013b576000815560010162000125565b5090565b50508160069080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f10620002d757805160ff191683800117855562000307565b8280016001018555821562000307579182015b8281111562000307578251825591602001919060010190620002ea565b5b506200032b9291505b808211156200013b576000815560010162000125565b5090565b50508060079080519060200190828054600181600116156101000203166002900490600052602060002090601f016020900481019282601f106200037b57805160ff1916838001178555620003ab565b82800160010185558215620003ab579182015b82811115620003ab5782518255916020019190600101906200038e565b5b50620003cf9291505b808211156200013b576000815560010162000125565b5090565b50505b50505050505b6107f580620003e86000396000f300606060405236156100885763ffffffff60e060020a6000350416630ad9d052811461008d5780631d1438481461011a5780632d9fff0114610143578063830c8b08146101d05780638da5cb5b146101eb578063aca2d46414610214578063b7d130ff146102a1578063cf08fed5146102ce578063f2fde38b1461035b578063f326971614610376575b610000565b346100005761009a610403565b6040805160208082528351818301528351919283929083019185019080838382156100e0575b8051825260208311156100e057601f1990920191602091820191016100c0565b505050905090810190601f16801561010c5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b3461000057610127610491565b60408051600160a060020a039092168252519081900360200190f35b346100005761009a6104a0565b6040805160208082528351818301528351919283929083019185019080838382156100e0575b8051825260208311156100e057601f1990920191602091820191016100c0565b505050905090810190601f16801561010c5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34610000576101e9600160a060020a036004351661052e565b005b346100005761012761057c565b60408051600160a060020a039092168252519081900360200190f35b346100005761009a61058b565b6040805160208082528351818301528351919283929083019185019080838382156100e0575b8051825260208311156100e057601f1990920191602091820191016100c0565b505050905090810190601f16801561010c5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34610000576102ba600160a060020a0360043516610616565b604080519115158252519081900360200190f35b346100005761009a61062d565b6040805160208082528351818301528351919283929083019185019080838382156100e0575b8051825260208311156100e057601f1990920191602091820191016100c0565b505050905090810190601f16801561010c5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b34610000576101e9600160a060020a03600435166106bb565b005b346100005761009a610737565b6040805160208082528351818301528351919283929083019185019080838382156100e0575b8051825260208311156100e057601f1990920191602091820191016100c0565b505050905090810190601f16801561010c5780820380516001836020036101000a031916815260200191505b509250505060405180910390f35b6005805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156104895780601f1061045e57610100808354040283529160200191610489565b820191906000526020600020905b81548152906001019060200180831161046c57829003601f168201915b505050505081565b600354600160a060020a031681565b6004805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156104895780601f1061045e57610100808354040283529160200191610489565b820191906000526020600020905b81548152906001019060200180831161046c57829003601f168201915b505050505081565b60005433600160a060020a0390811691161415610088576001805473ffffffffffffffffffffffffffffffffffffffff1916600160a060020a0383161790555b610578565b610000565b5b50565b600054600160a060020a031681565b6002805460408051602060018416156101000260001901909316849004601f810184900484028201840190925281815292918301828280156104895780601f1061045e57610100808354040283529160200191610489565b820191906000526020600020905b81548152906001019060200180831161046c57829003601f168201915b505050505081565b600154600160a060020a038281169116145b919050565b6007805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156104895780601f1061045e57610100808354040283529160200191610489565b820191906000526020600020905b81548152906001019060200180831161046c57829003601f168201915b505050505081565b60015433600160a060020a03908116911614806106e6575060005433600160a060020a039081169116145b156100885760008054600160a060020a03831673ffffffffffffffffffffffffffffffffffffffff199182161790915560018054909116905561056e81610578565b5b610578565b610000565b5b50565b6006805460408051602060026001851615610100026000190190941693909304601f810184900484028201840190925281815292918301828280156104895780601f1061045e57610100808354040283529160200191610489565b820191906000526020600020905b81548152906001019060200180831161046c57829003601f168201915b505050505081565b5b505600a165627a7a72305820d9dafb58cf689aec0a1cc6998f2a96a6182a8726d5a36fd2f0e00af1cd7c61af0029",
    "events": {
      "0xf729ea2a261eb380cd32a9eb1844a3a00e5c0f8e9a96035c92566112c04ec13f": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "addr",
            "type": "address"
          }
        ],
        "name": "SellerWasAuthorized",
        "type": "event"
      }
    },
    "updated_at": 1483790362839,
    "links": {}
  }
};

  Contract.checkNetwork = function(callback) {
    var self = this;

    if (this.network_id != null) {
      return callback();
    }

    this.web3.version.network(function(err, result) {
      if (err) return callback(err);

      var network_id = result.toString();

      // If we have the main network,
      if (network_id == "1") {
        var possible_ids = ["1", "live", "default"];

        for (var i = 0; i < possible_ids.length; i++) {
          var id = possible_ids[i];
          if (Contract.all_networks[id] != null) {
            network_id = id;
            break;
          }
        }
      }

      if (self.all_networks[network_id] == null) {
        return callback(new Error(self.name + " error: Can't find artifacts for network id '" + network_id + "'"));
      }

      self.setNetwork(network_id);
      callback();
    })
  };

  Contract.setNetwork = function(network_id) {
    var network = this.all_networks[network_id] || {};

    this.abi             = this.prototype.abi             = network.abi;
    this.unlinked_binary = this.prototype.unlinked_binary = network.unlinked_binary;
    this.address         = this.prototype.address         = network.address;
    this.updated_at      = this.prototype.updated_at      = network.updated_at;
    this.links           = this.prototype.links           = network.links || {};
    this.events          = this.prototype.events          = network.events || {};

    this.network_id = network_id;
  };

  Contract.networks = function() {
    return Object.keys(this.all_networks);
  };

  Contract.link = function(name, address) {
    if (typeof name == "function") {
      var contract = name;

      if (contract.address == null) {
        throw new Error("Cannot link contract without an address.");
      }

      Contract.link(contract.contract_name, contract.address);

      // Merge events so this contract knows about library's events
      Object.keys(contract.events).forEach(function(topic) {
        Contract.events[topic] = contract.events[topic];
      });

      return;
    }

    if (typeof name == "object") {
      var obj = name;
      Object.keys(obj).forEach(function(name) {
        var a = obj[name];
        Contract.link(name, a);
      });
      return;
    }

    Contract.links[name] = address;
  };

  Contract.contract_name   = Contract.prototype.contract_name   = "Vehicle";
  Contract.generated_with  = Contract.prototype.generated_with  = "3.2.0";

  // Allow people to opt-in to breaking changes now.
  Contract.next_gen = false;

  var properties = {
    binary: function() {
      var binary = Contract.unlinked_binary;

      Object.keys(Contract.links).forEach(function(library_name) {
        var library_address = Contract.links[library_name];
        var regex = new RegExp("__" + library_name + "_*", "g");

        binary = binary.replace(regex, library_address.replace("0x", ""));
      });

      return binary;
    }
  };

  Object.keys(properties).forEach(function(key) {
    var getter = properties[key];

    var definition = {};
    definition.enumerable = true;
    definition.configurable = false;
    definition.get = getter;

    Object.defineProperty(Contract, key, definition);
    Object.defineProperty(Contract.prototype, key, definition);
  });

  bootstrap(Contract);

  if (typeof module != "undefined" && typeof module.exports != "undefined") {
    module.exports = Contract;
  } else {
    // There will only be one version of this contract in the browser,
    // and we can use that.
    window.Vehicle = Contract;
  }
})();
