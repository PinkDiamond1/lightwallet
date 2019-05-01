import { Component, ViewChild } from '@angular/core'
import { IonicPage, NavController, NavParams, Platform } from 'ionic-angular'
import { MvsServiceProvider } from '../../providers/mvs-service/mvs-service'
import { AlertProvider } from '../../providers/alert/alert'
import { WalletServiceProvider } from '../../providers/wallet-service/wallet-service'
import { EtpBridgeServiceProvider, CreateOrderParameters } from '../../providers/etp-bridge-service/etp-bridge-service'

@IonicPage()
@Component({
    selector: 'page-etp-bridge',
    templateUrl: 'etp-bridge.html',
})

export class EtpBridgePage {

    addresses: Array<string>
    addressbalances: Array<any>
    sendFrom: string = "auto"
    changeAddress: string
    feeAddress: string = "auto"
    passphrase: string = ""
    etpBalance: number
    rawtx: string
    selectedAsset: string = "ETP"
    decimals: number = 8
    fee: number = 10000
    quantity: string = ""
    message: string = ""
    bridgeRate: any
    bridgePairs: any
    depositSymbolList: Array<string> = []

    createOrderParameters: CreateOrderParameters = {
        depositSymbol: "ETP",
        receiveSymbol: "BTC",
        receiveAmount: null,
        refundAddress: "",
        receiveAddress: "",
        depositAmount: null,
    }

    @ViewChild('quantityInput') quantityInput;

    constructor(
        public navCtrl: NavController,
        public navParams: NavParams,
        public platform: Platform,
        private mvs: MvsServiceProvider,
        private etpBridgeService: EtpBridgeServiceProvider,
        private alert: AlertProvider,
        private wallet: WalletServiceProvider,
    ) {

        this.getRate()

        etpBridgeService.getBridgePairs().toPromise().then(pairs => {
            this.bridgePairs = pairs
            console.log(this.bridgePairs)
            this.depositSymbolList = Object.keys(this.bridgePairs)
            console.log(this.depositSymbolList)
        });

        //Load addresses and balances
        Promise.all([this.mvs.getBalances(), this.mvs.getAddresses(), this.mvs.getAddressBalances()])
            .then(([balances, addresses, addressbalances]) => {
                this.etpBalance = balances.ETP.available
                this.addresses = addresses

                let addrblncs = []
                Object.keys(addresses).forEach((index) => {
                    let address = addresses[index]
                    if (addressbalances[address]) {
                        addrblncs.push({ "address": address, "avatar": addressbalances[address].AVATAR ? addressbalances[address].AVATAR : "", "identifier": addressbalances[address].AVATAR ? addressbalances[address].AVATAR : address, "balance": addressbalances[address].ETP.available })
                    } else {
                        addrblncs.push({ "address": address, "avatar": "", "identifier": address, "balance": 0 })
                    }
                })
                this.addressbalances = addrblncs
            })
    }

    getRate() {
        this.bridgeRate = undefined
        this.etpBridgeService.getBridgeRate(this.createOrderParameters.depositSymbol, this.createOrderParameters.receiveSymbol).toPromise().then(rate => {
            this.bridgeRate = rate
            console.log(this.bridgeRate)
        });
    }

    sell() {
        this.create()
            .then(tx => this.mvs.send(tx))
            .then((result) => {
                this.navCtrl.pop()
                this.alert.stopLoading()
                this.alert.showSent('SUCCESS_SEND_TEXT', result.hash)
            })
            .catch((error) => {
                console.error(error)
                this.alert.stopLoading()
                switch (error.message) {
                    case "ERR_CONNECTION":
                        this.alert.showError('ERROR_SEND_TEXT', '')
                        break;
                    case "ERR_CREATE_TX":
                        //already handle in create function
                        break;
                    default:
                        this.alert.showError('MESSAGE.BROADCAST_ERROR', error.message)
                }
            })
    }

    cancel(e) {
        e.preventDefault()
        this.navCtrl.pop()
    }

    create() {
        return this.alert.showLoading()
            .then(() => {
            })
            .catch((error) => {
                console.error(error.message)
                switch (error.message) {
                    default:
                        this.alert.showError('MESSAGE.CREATE_TRANSACTION', error.message)
                        throw Error('ERR_CREATE_TX')
                }
            })
    }

    changeDepositSymbol(newSymbol: string) {
        if (!this.isMetaverseSymbol(newSymbol) && !this.isMetaverseSymbol(this.createOrderParameters.receiveSymbol)) {
            this.createOrderParameters.receiveSymbol = "ETP"
        } else if (newSymbol === this.createOrderParameters.receiveSymbol){
            this.createOrderParameters.receiveSymbol = this.createOrderParameters.depositSymbol
        }
        this.createOrderParameters.depositSymbol = newSymbol
        this.getRate()
    }

    changeReceiveSymbol(newSymbol: string) {
        if (!this.isMetaverseSymbol(newSymbol) && !this.isMetaverseSymbol(this.createOrderParameters.depositSymbol)) {
            this.createOrderParameters.depositSymbol = "ETP"
        } else if (newSymbol === this.createOrderParameters.depositSymbol){
            this.createOrderParameters.depositSymbol = this.createOrderParameters.receiveSymbol
        }
        this.createOrderParameters.receiveSymbol = newSymbol
        this.getRate()
    }

    updateReceiveAmount() {
        this.createOrderParameters.receiveAmount = this.bridgeRate ? this.createOrderParameters.depositAmount * this.bridgeRate.instantRate * (1 - this.bridgeRate.depositCoinFeeRate) - this.bridgeRate.receiveCoinFee : 0
    }

    switch() {
        let tempSymbol = this.createOrderParameters.receiveSymbol
        this.createOrderParameters.receiveSymbol = this.createOrderParameters.depositSymbol
        this.createOrderParameters.depositSymbol = tempSymbol

        this.createOrderParameters.receiveAmount = 0
        this.createOrderParameters.depositAmount = 0

        this.getRate()
    }

    validDepositAmount = () => this.bridgeRate && this.createOrderParameters.depositAmount >= this.bridgeRate.depositMin && this.createOrderParameters.depositAmount <= this.bridgeRate.depositMax

    validAddress = (address, symbol) => {
        if(address === undefined || address == "") return false
        if(this.isMetaverseSymbol(symbol)){
            return this.mvs.validAddress(address)
        }
        return true
    }

    validRecipientAddress = () => this.validAddress(this.createOrderParameters.receiveAddress, this.createOrderParameters.receiveSymbol)

    validRefundAddress = () => this.validAddress(this.createOrderParameters.refundAddress, this.createOrderParameters.depositSymbol)

    private isMetaverseSymbol = (symbol: string = "") => {
        const validSymbols = ["ETP"] // at least 1 of these symbol is required
        return validSymbols.indexOf(symbol) !== -1
    }


}
