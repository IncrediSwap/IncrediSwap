const {
    createWalletSdk, AssetId, EthAddress, TxType, AccountId, GrumpkinAddress
} = require('@aztec/sdk');
const { randomBytes } = require('crypto');
import Web3 from 'web3';
import { useState, useEffect } from 'react';
import styles from '../styles/AztecComponent.module.css';

export default function AztecComponent(props) {
    const rollupProviderUrl = 'https://api.aztec.network/falafel';

    const [status, setStatus] = useState('Uninitialized')
    const [depositStatus, setDepositStatus] = useState(false)
    const [balanceDai, setBalanceDai] = useState('0')
    const [balanceEth, setBalanceEth] = useState('0')
    const [aztecPrivKey, setAztecPrivKey] = useState(undefined)
    const [balancePendingEth, setBalancePendingEth] = useState('0')
    const [balancePendingDai, setBalancePendingDai] = useState('0')
    const [sdk, setSdk] = useState(undefined)
    const [userId, setUserId] = useState(undefined)

    useEffect(async () => {
        await aztecInitialization();
    }, [props.account]);

    const aztecInitialization = async () => {
        const aztecSdk = await createWalletSdk(Web3.givenProvider, rollupProviderUrl);
        setSdk(aztecSdk)
        const status = 'Initialization in progress'
        setStatus(status)
        await aztecSdk.init();
        status = aztecSdk.getLocalStatus();
        setStatus(status.initState.toString())

        let aztecUser = localStorage.getItem('aztecUser');
        let privateKey = localStorage.getItem('aztecPrivKey')
        let userId
        if (aztecUser === null || aztecUser === undefined) {
            privateKey = randomBytes(32);
            setAztecPrivKey(privateKey)
            localStorage.setItem('aztecPrivKey', `0x${privateKey.toString('hex')}`)
            const user = await aztecSdk.addUser(privateKey);
            localStorage.setItem('aztecUser', user.id)
            setUserId(user.id)
            userId= user.id
        } else {
            setAztecPrivKey(Buffer.from(privateKey, 'hex'))
            userId = AccountId.fromString(aztecUser)
            setUserId(userId)
        }



        const balanceDai = aztecSdk.getBalance(AssetId.DAI, userId);
        const balanceETH = aztecSdk.getBalance(AssetId.ETH, userId);
        setBalanceDai(balanceDai.toString())
        setBalanceEth(balanceETH.toString())

        if (props.account !== undefined && props.account !== '') {
            console.info(props.account.toString())
            const ethereumAddress = EthAddress.fromString(props.account.toString())
            const pendingDepositDai = await aztecSdk.getUserPendingDeposit(AssetId.DAI, ethereumAddress);
            const pendingDepositEth = await aztecSdk.getUserPendingDeposit(AssetId.ETH, ethereumAddress);
            console.info(pendingDepositDai)
            console.info(pendingDepositEth)
            setBalancePendingDai(pendingDepositDai.toString())
            setBalancePendingEth(pendingDepositEth.toString())
        }

    }

    const deposit = async (assetId) => {
        setDepositStatus(true)
        let value = sdk.toBaseUnits(assetId, '0.002');
        let pendingDepositVar = assetId === AssetId.ETH ? balancePendingEth : balancePendingDai

        const txFee = await sdk.getFee(assetId, TxType.DEPOSIT);
        const totalDeposit = BigInt(value) + BigInt(txFee) - BigInt(pendingDepositVar);
        const depositor = EthAddress.fromString(props.account)
        console.info('>> fee : ', txFee, ' + value : ', value, ' + pending : ', pendingDepositVar)


        if (AssetId.ETH !== assetId) {
            const allowance = await sdk.getPublicAllowance(assetId, depositor);
            if (allowance < totalDeposit) {
                console.info('Approve rollup contract to spend your token...');
                await sdk.approve(assetId, totalDeposit, depositor);
                console.info('Approved!');
            }
            if (totalDeposit > 0) {
                console.info('Depositing funds to rollup contract...');
                await sdk.depositFundsToContract(assetId, depositor, totalDeposit);
            }
        } else {
            if (totalDeposit > 0) {
                await sdk.depositFundsToContract(assetId, depositor, totalDeposit);
            }
        }
        const signer = sdk.createSchnorrSigner(aztecPrivKey);
        const proofOutput = await sdk.createDepositProof(
            assetId,
            depositor,
            userId,
            value,
            txFee,
            signer
        );
        const signature = await sdk.signProof(proofOutput, depositor);
        console.info('signature : ', signature)

        const txHash = await sdk.sendProof(proofOutput, signature);
        console.info('transaction hash : ', txHash)
        await sdk.awaitSettlement(txHash, 10000);

        const balanceAfter = sdk.getBalance(assetId, userId);
        console.info('balance after deposit', balanceAfter)
        setDepositStatus(false)
    }

    return (
        <div className={styles.container}>
            <h4>Here you can interact with your Aztec account : </h4>
            <div className={styles.row}>
                <div className={styles.column}>
                    State of Aztec network :
                </div>
                <div className={styles.column}>
                    {status}
                </div>
            </div>
            <div className={styles.row}>
                <div className={styles.column}>
                    Balance On Aztec - DAI :
                </div>
                <div className={styles.column}>
                    {balanceDai}
                </div>
            </div>
            <div className={styles.row}>
                <div className={styles.column}>
                    Balance On Aztec - ETH :
                </div>
                <div className={styles.column}>
                    {balanceEth}
                </div>
            </div>
            <div className={styles.row}>
                <div className={styles.column}>
                    Pending balance On Aztec - ETH :
                </div>
                <div className={styles.column}>
                    {balancePendingEth}
                </div>
            </div>
            <div className={styles.row}>
                <div className={styles.column}>
                    Pending balance On Aztec - DAI :
                </div>
                <div className={styles.column}>
                    {balancePendingDai}
                </div>
            </div>
            <button onClick={() => deposit(AssetId.ETH)}>Deposit ETH</button>
            <button onClick={() => deposit(AssetId.DAI)}>Deposit DAI</button>
            {depositStatus && <p>State of deposit : In progress, please wait ...</p>}
        </div>
    )
}
