const {
    createWalletSdk, AssetId, EthAddress, TxType, AccountId, GrumpkinAddress, BridgeId
} = require('@aztec/sdk');
import Web3 from 'web3';
import { useState, useEffect } from 'react';

export default function SwapComponent() {
    const rollupProviderUrl = 'https://api.aztec.network/falafel';
    const defiBridge = EthAddress.fromString(
        '0xC4528eDC0F2CaeA2b9c65D05aa9A460891C5f2d4' // uniswap bridge
    );
    const [status, setStatus] = useState('Uninitialized')
    const [sdk, setSdk] = useState(undefined)
    const [swapStatus, setSwapStatus] = useState(false)

    useEffect(async () => {
        await aztecInitialization();
    }, []);

    const aztecInitialization = async () => {
        setStatus('Initialization in progress')
        const sdk = await createWalletSdk(Web3.givenProvider, rollupProviderUrl);
        setSdk(sdk);
        status = sdk.getLocalStatus();
        setStatus(status.initState.toString())
    }

    const swap = async (inputAssetId, outputAssetIdA) => {
        setSwapStatus(true)
        const outputAssetIdB = 0;


        let aztecUser = localStorage.getItem('aztecUser');
        let privateKey = localStorage.getItem('aztecPrivKey')
        let userId = AccountId.fromString(aztecUser)
        let privateAztecKey = Buffer.from(privateKey, 'hex')

        const bridgeId = new BridgeId(
            defiBridge,
            1,
            inputAssetId,
            outputAssetIdA,
            outputAssetIdB
        );
        const txFee = await sdk.getFee(inputAssetId, TxType.DEFI_DEPOSIT);

        const depositValue = sdk.toBaseUnits(inputAssetId, '0.0001');

        let initialETHBalance = sdk.getBalance(inputAssetId, userId);
        console.info('>>> initial balance in ETH :', initialETHBalance)
        let initialDAIBalance = sdk.getBalance(outputAssetIdA, userId);
        console.info('>>> initial balance in DAI :', initialDAIBalance)

        const signer = sdk.createSchnorrSigner(privateAztecKey);

        const proofOutput = await sdk.createDefiProof(
            bridgeId,
            userId,
            depositValue,
            txFee,
            signer
        );

        const txHash = await sdk.sendProof(proofOutput);

        await sdk.awaitSettlement(txHash, 10000);

        const defiTxs = await sdk.getDefiTxs(userId);
        console.info('>>> defi Transactions :', defiTxs)

        initialETHBalance = sdk.getBalance(inputAssetId, userId);
        console.info('>>> final balance in ETH :', initialETHBalance)

        initialDAIBalance = sdk.getBalance(outputAssetIdA, userId);
        console.info('>>> final balance in DAI :', initialDAIBalance)
        setSwapStatus(false)
    }

    return (
        <div>
            <h4>Be sure to have enought balance before swapping</h4>
            <p>State of Aztec SDK : {status}</p>
            <button onClick={() => swap(AssetId.ETH, AssetId.DAI)}>Swap ETH for Dai</button>
            <button onClick={() => swap(AssetId.DAI, AssetId.ETH)}>Swap Dai for ETH</button>
            {swapStatus && <p>State of deposit : In progress, please wait ...</p>}
        </div>

    )

}
