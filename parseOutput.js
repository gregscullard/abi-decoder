import abiDecoder from "abi-decoder";
import fs from "fs";
import axios from "axios";
import { ethers } from "ethers";

const filesLocation = './jsonFiles';
let mirrorUrl = "https://previewnet.mirrornode.hedera.com/api/v1";

async function main() {

    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.error("Missing input data");
        return;
    }

    const testData = args[0];
    // const testData = "0.0.8908-1677076422-839950873";
    // const testData = "0x53d9d9100000000000000000000000000000000000000000000000000000000000000060000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002000000000000000000000000a6d9c5f7d4de3cef51ad3b7235d79ccc95114de5000000000000000000000000a6d9c5f7d4de3cef51ad3b7235d79ccc95114daa";
    if (testData.startsWith("0.0.")) {
        // we have a transaction id
        if (args.length > 1) {
            let network = args[1] === "mainnet" ? "mainnet-public" : args[1];
            mirrorUrl = mirrorUrl.replace("previewnet", network);
        }
        // rework transaction id for mirror node
        let transactionId = testData.replaceAll(".", "-");
        transactionId = transactionId.replaceAll("@", "-");
        transactionId = transactionId.replace("0-0-", "0.0.");
        const callStack = await getCallStack(transactionId);
        for (const action of callStack.actions) {
            console.log("");
            console.log(`Call depth ${action.call_depth}_${action.index}`);
            logWithTabulation(action.call_depth, `type ${action.call_type}, from (${action.caller_type}) ${action.caller} / ${action.from}, to (${action.recipient_type}) ${action.recipient} / ${action.to}, result ${action.result_data_type}`);

            let input = action.input;
            let output = action.result_data;

            if (input === "0x" || output === "0x") {
                // get detailed results
                const result = await getDetailedResult(action.recipient, action.timestamp);
                if (input === "0x") {
                    input = result.function_parameters;
                }
                if (output === "0x") {
                    output = result.call_result;
                }
            }

            logWithTabulation(action.call_depth, `input ${input}`);
            if (input !== "0x") {
                decodeOutput(action.call_depth, input);
            }
            if (action.result_data_type === "REVERT_REASON") {
                if (output !== "0x") {
                    // decode revert (assume it's a string)
                    const reason = ethers.utils.defaultAbiCoder.decode(
                        ['string'],
                        ethers.utils.hexDataSlice(output, 4)
                    );
                    logWithTabulation(action.call_depth, `Revert reason: ${reason[0]}`);
                } else {
                    logWithTabulation(action.call_depth, `Revert reason: unknown (0x)`);
                }
            } else if (output !== "0x") {
                logWithTabulation(action.call_depth, `output ${output}`);
                decodeOutput(action.call_depth, output);
            }
        }
        return;
    } else {
       decodeOutput(0, testData);
    }
}

function logWithTabulation(depth, data) {
    console.log(`${" ".repeat(2 * depth)} - ${data}`);
}

async function getCallStack(transactionId) {
    let response = await axios({
        url: `${mirrorUrl}/contracts/results/${transactionId}/actions?limit=100&order=asc`,
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    if (response.status === 200) {
        return response.data;
    } else {
        console.log(`Mirror response ${response.status}`);
        throw new Error(`Mirror response error`);
    }
}

async function getDetailedResult(contractId, timestamp) {
    //https://previewnet.mirrornode.hedera.com/api/v1/contracts/0.0.8920/results/1677076435.787504003
    let response = await axios({
        url: `${mirrorUrl}/contracts/${contractId}/results/${timestamp}`,
        method: 'get',
        headers: {
            'Content-Type': 'application/json',
        }
    });
    if (response.status === 200) {
        return response.data;
    } else {
        console.log(`Mirror response ${response.status}`);
        throw new Error(`Mirror response error`);
    }
}

function decodeOutput(depth, testData) {
    let decodedData = undefined;

    fs.readdirSync(filesLocation).forEach(file => {
        // load the file
        const fileData = fs.readFileSync(`${filesLocation}/${file}`);
        const fileJson = JSON.parse(fileData.toString());
        let fileAbi = fileJson;
        // check if json contains an abi attribute
        if (fileJson["abi"]) {
            fileAbi = fileJson["abi"];
        }
        // pass the abi to the decoder
        abiDecoder.addABI(fileAbi);
        decodedData = abiDecoder.decodeMethod(testData);
        if (decodedData) {
            logWithTabulation(depth, `Found match in ${file}`);
            console.dir(decodedData);
            return;
        }
    });
    if (! decodedData) {
        logWithTabulation(depth, "No match found in ABI files for supplied data");
    }
}

main();
