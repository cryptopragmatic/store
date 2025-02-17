// import { MetaMaskSDK } from '@metamask/sdk';
import { StoreAbi } from './storeabi';
import { ethers } from 'ethers';
import { ExternalProvider } from "@ethersproject/providers";
import $ from 'jquery';

const contractAddress = '0xa174e60ef8b3b1fa7c71bb91d685191e915baaed';

let signer;
let provider;
let contract;
let accs;

declare global {
    interface Window {
        ethereum?: ExternalProvider;
    }
}

const start = async () => {
    if (window.ethereum !== undefined && window.ethereum.request !== undefined) {
        accs = await window.ethereum.request({
            method: 'eth_requestAccounts',
            params: [],
        });

        provider = new ethers.providers.Web3Provider(window.ethereum)
        signer = await provider.getSigner();

        const { chainId } = await provider.getNetwork();
        if (chainId != 56) {
            await window.ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: "0x38",
                    rpcUrls: ["https://bsc-dataseed.binance.org"],
                    chainName: "BSC Mainnet",
                    nativeCurrency: {
                        name: "BNB",
                        symbol: "BNB",
                        decimals: 18
                    },
                    blockExplorerUrls: ["https://bscscan.com"]
                }]
            });
            window.location.href = "./";
        }

        if (signer != null) {
            contract = new ethers.Contract(contractAddress, StoreAbi, signer);
            contract.connect(provider);
        }
    }

    $.getJSON("https://nodes.anotedao.com/addresses/data/3AQT89sRrWHqPSwrpfJAj3Yey7BCBTAy4jT/%25s__nodePrice", function(data) {
        $("#nodePrice").val((data.value / 100).toFixed(2));
    });

    $.getJSON("https://nodes.anotedao.com/addresses/data/3AQT89sRrWHqPSwrpfJAj3Yey7BCBTAy4jT/%25s__nodeTier", function(data) {
        $("#nodeTier").val(data.value);
    });

    $.getJSON("https://nodes.anotedao.com/assets/balance/3AQT89sRrWHqPSwrpfJAj3Yey7BCBTAy4jT/auiheGJjoLj6B41v6GChAeCzEUaj2UDFu5rDqbfNHew", function(data) {
        $("#nodeTotal").val(data.balance);
    });
};

if (window.ethereum == null || window.ethereum == undefined) {
    $("#loading").fadeOut(function() {
        $("#error").fadeIn();
    });
} else {
    $("#loading").fadeOut(function() {
        $("#success").fadeIn();
        start();
    });
}

$("#mbtn").on("click", function() {
    $("#errMsg").fadeOut(function() {
        $("#errMsg").html('');
    });
    
    var address = $("#address").val();
    var amount = $("#amount").val();

    if (address && amount && address?.toString().length > 0 && amount?.toString().length > 0) {
        $("#success").fadeOut(async function() {
            $("#loading").fadeIn();

            var address = $("#address").val();
            var amount = $("#amount").val();

            if (address && amount && address?.toString().length > 0 && amount?.toString().length > 0) {
                try {
                    var amt = parseInt(amount?.toString());
                    var total = await calculateTotal(amt);
                    var totalBig = ethers.BigNumber.from(parseInt((total * 100)?.toString()));
                    var fee = ethers.BigNumber.from("10000000000000000");
                    const options = {value: fee.mul(ethers.BigNumber.from(totalBig))};
                    console.log(options);
                    var tx = await contract.mintNode(address, options);
                    await tx.wait()
                } catch (e: any) {
                    console.log(e);
                    $("#errMsg").html(e.message);
                    $("#errMsg").show();
                }
            }
    
            $("#loading").fadeOut(function() {
                $("#success").fadeIn();
            });
        });
    } else {
        $("#errMsg").html("Both fields are required.");
        $("#errMsg").fadeIn(function() {
            setTimeout(function() {
                $("#errMsg").fadeOut();
            }, 2000);
        });
    }
});

$("#amount").on("keyup", async function() {
    var amount = $("#amount").val();

    if (amount && amount?.toString().length > 0) {
        var amountInt = parseInt(amount?.toString());
        var total = await calculateTotal(amountInt);

        $("#total").html(total.toFixed(2));
    } else {
        $("#total").html("0.00");
    }
});

async function calculateTotal(amountInt) {
    var nodePrice = 0;
    var nodeTier = 0;

    await $.getJSON("https://nodes.anotedao.com/addresses/data/3AQT89sRrWHqPSwrpfJAj3Yey7BCBTAy4jT/%25s__nodePrice", function(data) {
        nodePrice = data.value / 100;
    });

    await $.getJSON("https://nodes.anotedao.com/addresses/data/3AQT89sRrWHqPSwrpfJAj3Yey7BCBTAy4jT/%25s__nodeTier", function(data) {
        nodeTier = data.value;
    });

    var total = 0;

    if (nodeTier >= amountInt) {
        total = parseFloat(amountInt) * nodePrice;
    } else {
        while (amountInt > 0) {
            total += nodeTier * nodePrice;
            amountInt -= nodeTier;
            if (amountInt > 10) {
                nodeTier = 10;
            } else {
                nodeTier = amountInt;
            }
            nodePrice += 0.01;
        }
    }

    return total;
}