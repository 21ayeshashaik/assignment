import type { useForm } from 'core/form'
import { s } from 'core/form'
import type { ShippingBillFormValues } from './model'

const positive = s.string().refine((value) => (Number(value) > 0 ? undefined : 'Enter a number above zero'))

function optionalNonNegative(message: string) {
  return s
    .string()
    .refine((value) => (!value || Number(value) >= 0 ? undefined : message))
    .optional()
}

// The form library resolves nested array rules by their final field name.
export const shippingBillFormSchema = s.object({
  jobNumber: s.string().optional(),
  jobDate: s.string(),
  exporterId: s.string(),
  exporterBranchId: s.string(),
  consigneeId: s.string(),
  consigneeBranchId: s.string(),
  loadingPort: s.string(),
  finalDestinationPort: s.string(),
  dischargePort: s.string().optional(),
  originStateCode: s.string().optional(),
  nfeiCategory: s.string().optional(),
  rbiWaiverNumber: s.string().optional(),
  rbiWaiverDate: s.string().optional(),
  sealType: s.string().optional(),
  numberOfContainers: optionalNonNegative('Container count cannot be negative'),
  natureOfCargo: s.string().optional(),
  grossWeight: optionalNonNegative('Gross weight cannot be negative'),
  netWeight: optionalNonNegative('Net weight cannot be negative'),
  measurementUnit: s.string().optional(),
  totalPackages: optionalNonNegative('Package count cannot be negative'),
  marksAndNumbers: s.string().optional(),
  loosePackets: optionalNonNegative('Loose packet count cannot be negative'),
  mawbNumber: s.string().optional(),
  hawbNumber: s.string().optional(),
  invoiceNumber: s.string(),
  invoiceDate: s.string(),
  currency: s.string(),
  invoiceTotal: optionalNonNegative('Total cannot be negative'),
  contractType: s.string(),
  buyerId: s.string().optional(),
  buyerBranchId: s.string().optional(),
  thirdPartyId: s.string().optional(),
  thirdPartyBranchId: s.string().optional(),
  ritcCode: s.string(),
  goodsDescription1: s.string(),
  quantity: positive,
  unitOfMeasurement: s.string(),
  unitPrice: positive,
  freightRate: optionalNonNegative('Rate cannot be negative'),
  freightAmount: optionalNonNegative('Amount cannot be negative'),
  insuranceRate: optionalNonNegative('Rate cannot be negative'),
  insuranceAmount: optionalNonNegative('Amount cannot be negative'),
  commissionRate: optionalNonNegative('Rate cannot be negative'),
  commissionAmount: optionalNonNegative('Amount cannot be negative'),
  discountRate: optionalNonNegative('Rate cannot be negative'),
  discountAmount: optionalNonNegative('Amount cannot be negative'),
  otherDeductionsRate: optionalNonNegative('Rate cannot be negative'),
  otherDeductionsAmount: optionalNonNegative('Amount cannot be negative'),
  packingCharges: optionalNonNegative('Packing charges cannot be negative'),
  periodOfPayment: optionalNonNegative('Payment period cannot be negative'),
  containerNumber: s.string().optional(),
  packingNumberFrom: s.string().optional(),
  packingNumberTo: s.string().optional(),
  documentTypeCode: s.string().optional(),
  documentReferenceNumber: s.string().optional(),
  registrationNumber: s.string().optional()
})

export type BillFormContext = ReturnType<typeof useForm<ShippingBillFormValues>>

export type BranchPath =
  | 'exporterBranchId'
  | 'consigneeBranchId'
  | `invoices.${number}.buyerBranchId`
  | `invoices.${number}.thirdPartyBranchId`
  | `invoices.${number}.items.${number}.itemThirdPartyBranchId`
