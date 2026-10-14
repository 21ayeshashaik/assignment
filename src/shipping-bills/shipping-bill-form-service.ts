import { documentCodes } from '@/data/e-sanchit-codes'
import { quantityCodes } from '@/data/quantity-code'
import schemeCodes from '@/data/scheme-codes'
import { stateOptions } from '@/data/states'
import { Trades } from '@/data/trade-agrements'
import { cargoOptions, contractTypes, paymentTypes, priceInclusionTypes, sealTypes, weightUnits } from '@/data/types'
import { getDemoData, saveBill } from './demo-store'
import { ports, SavedBill, ShippingBillFormValues } from './model'

const MOCK_LATENCY_MS = 180

function simulateLatency<T>(result: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(result), MOCK_LATENCY_MS))
}

const currencyOptions = ['USD', 'EUR', 'INR', 'AED', 'GBP', 'SGD'].map((value) => ({ value, label: value }))
const nfeiCategoryOptions = [
  { value: '01', label: 'Free trade sample' },
  { value: '02', label: 'Diplomatic goods' },
  { value: '03', label: 'Warranty replacement' },
  { value: '07', label: 'Gift parcel' },
  { value: '08', label: 'Other' }
]
const containerSizes = [
  { value: '20', label: '20 ft' },
  { value: '40', label: '40 ft' },
  { value: '45', label: '45 ft' }
]
const containerSealTypes = [
  { value: 1, label: 'BTSL - Bottle Seal' },
  { value: 2, label: 'ESEAL - Electronic Seal' },
  { value: 3, label: 'RFID - Radio Frequency Identifier' }
]
const igstPaymentOptions = [
  { value: 'NA', label: 'Not applicable' },
  { value: 'LUT', label: 'Under LUT / bond' },
  { value: 'P', label: 'Against payment' }
]
const accessoryStatusOptions = [
  { value: '0', label: 'No accessory' },
  { value: '1', label: 'Included free of cost' },
  { value: '2', label: 'Entered separately' }
]
const documentFileTypes = [{ value: 'pdf', label: 'PDF' }]
const goodsSourceOptions = [
  { value: 'I', label: 'Imported' },
  { value: 'D', label: 'Indigenous' }
]

export async function loadShippingBillFormOptions() {
  return simulateLatency({
    portOptions: ports.map((port) => ({ value: port.code, label: `${port.name} · ${port.code}` })),
    currencyOptions,
    documentCodes,
    quantityCodes,
    schemeCodes,
    stateOptions,
    tradeAgreements: Trades,
    cargoOptions,
    contractTypes,
    paymentTypes,
    priceInclusionTypes,
    sealTypes,
    weightUnits,
    nfeiCategoryOptions,
    containerSizes,
    containerSealTypes,
    igstPaymentOptions,
    accessoryStatusOptions,
    documentFileTypes,
    goodsSourceOptions
  })
}

export type ShippingBillFormOptions = Awaited<ReturnType<typeof loadShippingBillFormOptions>>

export async function loadShippingBills(): Promise<SavedBill[]> {
  const { bills } = await simulateLatency(getDemoData())
  return bills
}

export async function loadShippingBill(id: number): Promise<SavedBill | undefined> {
  const { bills } = await simulateLatency(getDemoData())
  return bills.find((bill) => bill.id === id)
}

async function persistShippingBill(values: ShippingBillFormValues, id?: number): Promise<SavedBill> {
  await simulateLatency(undefined)
  return saveBill(values, id)
}

export async function saveShippingBillDraft(values: ShippingBillFormValues, id?: number): Promise<SavedBill> {
  return persistShippingBill(values, id)
}

export async function submitShippingBill(values: ShippingBillFormValues, id?: number): Promise<SavedBill> {
  return persistShippingBill(values, id)
}
