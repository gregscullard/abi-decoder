# abi-decoder

utility to decode input parameters to a contract function from a number of possible ABIs

## setup

```shell
npm install
```

add files containing your ABIs to the `./jsonFiles` folder. 
note, the files may contain just the ABI (e.g. [...]) or be a full compilation output containing bytecode, etc... as long as the json is either the ABI itself or contains an attribute called `abi`, the utility will find it.

## run

if you have the raw data input into a contract call, use

```shell
node parseOutput.js "your function call data"
```

for example

```shell
node parseOutput 0x53d9d9100000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000a6d9c5f7d4de3cef51ad3b7235d79ccc95114de500000000000000
0000000000a6d9c5f7d4de3cef51ad3b7235d79ccc95114daa
```

or if you have a transaction id, use

```shell
node parseOutput.js transactionId network
```

for example

```shell
node parseOutput.js 0.0.8908-1677076422-839950873 previewnet
```

note: the default network is `previewnet` so you can omit it if that's the network you're using
