build: FORCE
	truffle build	

test: FORCE
	(testrpc > /dev/null) & truffle test -e test
	killall node
FORCE: 
