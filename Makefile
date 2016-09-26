build: FORCE
	./node_modules/truffle/cli.js build	

test: FORCE
	(./node_modules/ethereumjs-testrpc/bin/testrpc > /dev/null) & ./node_modules/truffle/cli.js test -e test
	killall node
FORCE: 
