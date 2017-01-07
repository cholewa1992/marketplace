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
      throw new Error("StandardMarketplace error: Please call setProvider() first before calling new().");
    }

    var args = Array.prototype.slice.call(arguments);

    if (!this.unlinked_binary) {
      throw new Error("StandardMarketplace error: contract binary not set. Can't deploy new instance.");
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

      throw new Error("StandardMarketplace contains unresolved libraries. You must deploy and link the following libraries before you can deploy a new version of StandardMarketplace: " + unlinked_libraries);
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
      throw new Error("Invalid address passed to StandardMarketplace.at(): " + address);
    }

    var contract_class = this.web3.eth.contract(this.abi);
    var contract = contract_class.at(address);

    return new this(contract);
  };

  Contract.deployed = function() {
    if (!this.address) {
      throw new Error("Cannot find deployed address: StandardMarketplace not deployed or address not set.");
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
        "constant": false,
        "inputs": [
          {
            "name": "_item",
            "type": "address"
          }
        ],
        "name": "completeTransaction",
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
        "inputs": [
          {
            "name": "",
            "type": "address"
          }
        ],
        "name": "offers",
        "outputs": [
          {
            "name": "seller",
            "type": "address"
          },
          {
            "name": "buyer",
            "type": "address"
          },
          {
            "name": "amount",
            "type": "uint256"
          },
          {
            "name": "state",
            "type": "uint8"
          }
        ],
        "payable": false,
        "type": "function"
      },
      {
        "constant": false,
        "inputs": [
          {
            "name": "_item",
            "type": "address"
          },
          {
            "name": "_buyer",
            "type": "address"
          },
          {
            "name": "_price",
            "type": "uint256"
          }
        ],
        "name": "extendOffer",
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
        "constant": false,
        "inputs": [
          {
            "name": "_item",
            "type": "address"
          }
        ],
        "name": "abortTransaction",
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
        "constant": false,
        "inputs": [
          {
            "name": "_item",
            "type": "address"
          }
        ],
        "name": "acceptOffer",
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
        "constant": false,
        "inputs": [
          {
            "name": "_item",
            "type": "address"
          }
        ],
        "name": "revokeOffer",
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
        "name": "token",
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
        "inputs": [
          {
            "name": "_token",
            "type": "address"
          }
        ],
        "payable": false,
        "type": "constructor"
      },
      {
        "payable": false,
        "type": "fallback"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "BuyerAcceptedOffer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "SellerAddedOffer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "SellerRevokedOffer",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "BuyerCompletedTransaction",
        "type": "event"
      },
      {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "BuyerAbortedTransaction",
        "type": "event"
      }
    ],
    "unlinked_binary": "0x60606040523461000057604051602080610fb383398101604052515b60018054600160a060020a031916600160a060020a038381169190911791829055604080516000602091820181905282517f18160ddd00000000000000000000000000000000000000000000000000000000815292519094909316926318160ddd92600480820193929182900301818787803b156100005760325a03f115610000575050604051519190911190506100b257610000565b600154604080516000602091820181905282517f70a08231000000000000000000000000000000000000000000000000000000008152600160a060020a033081166004830152935193909416936370a08231936024808301949391928390030190829087803b156100005760325a03f1156100005750506040515115905061013957610000565b5b505b610e688061014b6000396000f300606060405236156100675763ffffffff60e060020a6000350416631b6e78688114610079578063413bf38f146100a65780635d680d6314610101578063928abfd414610137578063b6261d0a14610164578063d0d9827614610191578063fc0c546a146101be575b34610000576100775b610000565b565b005b3461000057610092600160a060020a03600435166101e7565b604080519115158252519081900360200190f35b34610000576100bf600160a060020a036004351661047b565b60408051600160a060020a038087168252851660208201529081018390526060810182600281116100005760ff16815260200194505050505060405180910390f35b3461000057610092600160a060020a03600435811690602435166044356104b4565b604080519115158252519081900360200190f35b3461000057610092600160a060020a036004351661067b565b604080519115158252519081900360200190f35b3461000057610092600160a060020a036004351661087c565b604080519115158252519081900360200190f35b3461000057610092600160a060020a0360043516610ac8565b604080519115158252519081900360200190f35b34610000576101cb610d2b565b60408051600160a060020a039092168252519081900360200190f35b600160a060020a038181166000908152600260205260408120600101549091829184913381169116141561007057600160a060020a03841660009081526002602081905260409091209250600383015460ff166002811161000057146102505760009250610469565b600082600201541115610342576002820154600160a060020a038086166000908152600360209081526040808320600188015490941683529290522054101561029c5760009250610469565b600282018054600160a060020a0380871660009081526003602090815260408083206001808a01548616855290835281842080549690960390955593548754955485518301849052855160e060020a63a9059cbb028152968516600488015260248701529351939092169363a9059cbb936044808301949391928390030190829087803b156100005760325a03f115610000575050604051511515905061034257610000565b5b6001820154604080517ff2fde38b000000000000000000000000000000000000000000000000000000008152600160a060020a03928316600482015290519186169163f2fde38b9160248082019260009290919082900301818387803b156100005760325a03f11561000057505060408051600160a060020a038716815290517f7e3eaa0a032e9993309ef91f33093ee08ca3b9015f33aa6aad781cd924bcbec892509081900360200190a1600160a060020a0380851660009081526002602081815260409283902083516080810185528154861681526001820154909516918501919091528082015492840192909252600382015461046493889390929091606084019160ff909116908111610000576002811161000057905250610d3a565b600192505b610473565b610000565b5b5050919050565b60026020819052600091825260409091208054600182015492820154600390920154600160a060020a0391821693909116919060ff1684565b60008380600160a060020a0316638da5cb5b6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b156100005760325a03f1156100005750505060405180519050600160a060020a031633600160a060020a03161415610070578480600160a060020a031663b7d130ff306000604051602001526040518263ffffffff1660e060020a0281526004018082600160a060020a0316600160a060020a03168152602001915050602060405180830381600087803b156100005760325a03f1156100005750506040515115905061007057600160a060020a038616600090815260026020819052604082206003015460ff1690811161000057146105d2576000925061065c565b60008410156105e4576000925061065c565b60408051608081018252600160a060020a0333811682528716602082015290810185905261061b9087906060810160019052610d9b565b60408051600160a060020a038816815290517f3e19273edb7a280925c08e9a20bcb5dfefcd1bef3652efd9ad2b68571b13d00f9181900360200190a1600192505b610666565b610000565b5b50610672565b610000565b5b509392505050565b600160a060020a0381811660009081526002602052604081206001015490918291829185913382169116141561007057600160a060020a03851660009081526002602081905260409091209350600384015460ff166002811161000057146106e65760009350610869565b600160a060020a038086166000908152600360209081526040808320600188015490941683529290529081205492508211156107b257600160a060020a038086166000908152600360209081526040808320600180890180548716865291845282852085905554905482518401859052825160e060020a63a9059cbb028152908616600482015260248101889052915194169363a9059cbb93604480840194938390030190829087803b156100005760325a03f11561000057505060405151151590506107b257610000565b5b60408051600160a060020a038716815290517f888ff0188944a22067578f2034ac7536bb16ac95d0bd428e743f149aabe5d8e39181900360200190a1600160a060020a0380861660009081526002602081815260409283902083516080810185528154861681526001820154909516918501919091528082015492840192909252600382015461086493899390929091606084019160ff909116908111610000576002811161000057905250610d3a565b600193505b610873565b610000565b5b505050919050565b600160a060020a038181166000908152600260205260408120600101549091829184913381169116141561007057600160a060020a038416600090815260026020526040902091506001600383015460ff166002811161000057146108e45760009250610469565b600082600201541115610a655760028201546001805490840154604080516000602091820181905282517fdd62ed3e000000000000000000000000000000000000000000000000000000008152600160a060020a03948516600482015230851660248201529251939094169363dd62ed3e936044808501949192918390030190829087803b156100005760325a03f115610000575050506040518051905010156109915760009250610469565b60018054908301546002840154604080516000602091820181905282517f23b872dd000000000000000000000000000000000000000000000000000000008152600160a060020a03958616600482015230861660248201526044810194909452915193909416936323b872dd93606480850194929391928390030190829087803b156100005760325a03f1156100005750506040515115159050610a3457610000565b6002820154600160a060020a0380861660009081526003602090815260408083206001880154909416835292905220555b60038201805460ff1916600217905560408051600160a060020a038616815290517f31ca4b0cb3279adbdcc13b12a0e4b6b18ee257dc1cdb6420b488a9d5b0ddaa0c916020908290030190a1600192505b610473565b610000565b5b5050919050565b6000600060008380600160a060020a0316638da5cb5b6000604051602001526040518163ffffffff1660e060020a028152600401809050602060405180830381600087803b156100005760325a03f1156100005750505060405180519050600160a060020a031633600160a060020a0316141561007057600160a060020a03851660009081526002602081905260408220600381015490955060ff16908111610000571415610b7a5760009350610869565b600160a060020a03808616600090815260036020908152604080832060018801549094168352929052205491506002600384015460ff166002811161000057148015610bc65750600082115b15610c6157600160a060020a038086166000908152600360209081526040808320600180890180548716865291845282852085905554905482518401859052825160e060020a63a9059cbb028152908616600482015260248101889052915194169363a9059cbb93604480840194938390030190829087803b156100005760325a03f1156100005750506040515115159050610c6157610000565b5b60408051600160a060020a038716815290517ff769bcbbfd5dc9f0e10a2f70e0123f802099a2085893f906699ae6bc78ec24469181900360200190a1600160a060020a0380861660009081526002602081815260409283902083516080810185528154861681526001820154909516918501919091528082015492840192909252600382015461086493899390929091606084019160ff909116908111610000576002811161000057905250610d3a565b600193505b610873565b610000565b5b505050919050565b600154600160a060020a031681565b600160a060020a03821660009081526002602081905260408220805473ffffffffffffffffffffffffffffffffffffffff199081168255600182018054909116905590810191909155600301805460ff19169055610d96828282565b5b5050565b600160a060020a038083166000908152600260208181526040928390208551815490861673ffffffffffffffffffffffffffffffffffffffff199182161782559186015160018083018054929097169190931617909455918401518382015560608401516003840180548695949293919260ff199091169184908111610000570217905550905050610d968282610d96565b5b5050565b5b5050565b5b50505600a165627a7a723058201d18213dbe6b5592459ffbb6d7a7b96822394d5ddf380ca1e4d5356c659a57390029",
    "events": {
      "0x31ca4b0cb3279adbdcc13b12a0e4b6b18ee257dc1cdb6420b488a9d5b0ddaa0c": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "BuyerAcceptedOffer",
        "type": "event"
      },
      "0x3e19273edb7a280925c08e9a20bcb5dfefcd1bef3652efd9ad2b68571b13d00f": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "SellerAddedOffer",
        "type": "event"
      },
      "0xf769bcbbfd5dc9f0e10a2f70e0123f802099a2085893f906699ae6bc78ec2446": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "SellerRevokedOffer",
        "type": "event"
      },
      "0x7e3eaa0a032e9993309ef91f33093ee08ca3b9015f33aa6aad781cd924bcbec8": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "BuyerCompletedTransaction",
        "type": "event"
      },
      "0x888ff0188944a22067578f2034ac7536bb16ac95d0bd428e743f149aabe5d8e3": {
        "anonymous": false,
        "inputs": [
          {
            "indexed": false,
            "name": "item",
            "type": "address"
          }
        ],
        "name": "BuyerAbortedTransaction",
        "type": "event"
      }
    },
    "updated_at": 1483790362822,
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

  Contract.contract_name   = Contract.prototype.contract_name   = "StandardMarketplace";
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
    window.StandardMarketplace = Contract;
  }
})();
