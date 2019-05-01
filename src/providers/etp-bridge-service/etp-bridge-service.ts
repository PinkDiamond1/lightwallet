import { Injectable } from '@angular/core'
import { Http } from '@angular/http'
import { Observable } from 'rxjs'

import 'rxjs/add/operator/map'

@Injectable()
export class EtpBridgeServiceProvider {

  private URL = "https://bridge.mvs.org/api"

  constructor(public http: Http) {
  }

  getBridgeRate(depositSymbol, receiveSymbol): Observable<Rate> {
    return this.http.get(`${this.URL}/rate/${depositSymbol}/${receiveSymbol}`)
      .map(response => response.json())
  }

  getBridgePairs(): Observable<Pairs> {
    return this.http.get(`${this.URL}/pairs`)
      .map(response => response.json())
  }

  getOrder(id: string): Observable<OrderDetails> {
    return this.http.get(`${this.URL}/order/${id}`)
      .map(response => response.json())
  }

  createOrder(order: CreateOrderParameters): Observable<OrderDetails> {
    return this.http.post(`${this.URL}/order`, order)
      .map(response => response.json())
  }

}

export interface CreateOrderParameters {
  depositSymbol: string
  depositAmount: number
  refundAddress: string
  receiveSymbol: string
  receiveAmount: number
  receiveAddress: string
}

export interface Pairs { [index: string]: string[] }

export interface Rate {
  depositMax: number
  depositMin: number
  instantRate: number
  receiveCoinFee: number // Fixed fee to be payed in receive coin (not rate)
  minerFee?: number // Only if SWFT token is used to pay fee
  depositCoinFeeRate?: number // Fee rate if SWFT token is not used to pay fee
}

export interface OrderDetails {
  id: string
  status: string
  deposit: {
    symbol: string
    amount: number
    fee: number
    feeRate: number
    status: string
  }
  receive: {
    symbol: string
    amount: number
    address: string
    txid: string
  }
  refund: {
    address: string
    amount?: number
    fee?: number
    txid?: string
  }
}

