import { routes } from '@/shared/route-paths'
import { useFieldArray, useForm } from 'core/form'
import { Form } from 'core/form/components'
import { navigate, useParams } from 'core/routing'
import { toast } from 'core/toast-manager'
import { useEffect, useRef, useState } from 'react'
import { Button } from 'ui/basic/button'
import { Card, CardContent, CardHeader } from 'ui/basic/card'
import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import { Tabs, TabsList, TabsTrigger } from 'ui/interactive/tabs'
import { useDemoData } from './demo-store'
import { getMarksAndNumbersOptions, MarksAndNumbersOption } from './marks-and-numbers-source'
import {
  Branch,
  Business,
  emptyBill,
  emptyDocument,
  emptyInvoice,
  Exporter,
  portCountry,
  SavedBill,
  ShippingBillFormValues
} from './model'
import { BranchDialog, PartyDialog } from './party-dialogs'
import { partyMockService } from './party-mock-service'
import {
  Advanced,
  AsyncPartySelect,
  InvoiceEditor,
  PartyFields,
  PersistentTab,
  SectionHeading
} from './shipping-bill-form-sections'
import {
  loadShippingBill,
  loadShippingBillFormOptions,
  saveShippingBillDraft,
  ShippingBillFormOptions,
  submitShippingBill
} from './shipping-bill-form-service'
import type { BillFormContext, BranchPath } from './shipping-bill-form-types'
import { shippingBillFormSchema } from './shipping-bill-form-types'
import { workflowSteps } from './workflow'

const dateType = 'date' as 'text'

interface QuickAdd {
  kind: 'exporter' | 'business'
  role?: 'consignee' | 'buyer' | 'thirdParty' | 'itemThirdParty'
  invoiceIndex?: number
  itemIndex?: number
}

interface QuickBranch {
  kind: 'exporter' | 'business'
  ownerId: number
  branchName: BranchPath
}

function DocumentItem({
  formCtx,
  index,
  options,
  onRemove
}: {
  formCtx: BillFormContext
  index: number
  options: ShippingBillFormOptions
  onRemove: () => void
}) {
  const { register, watch } = formCtx.hooks
  const { documentCodes } = options
  const documentValues = watch(`documents.${index}`)

  const hasCustomValues = [
    documentValues.placeOfIssue,
    documentValues.invoiceSerialNumber,
    documentValues.itemSerialNumber,
    documentValues.issuingPartyCode,
    documentValues.issuingPartyName,
    documentValues.issuingPartyAddress1,
    documentValues.issuingPartyAddress2,
    documentValues.issuingPartyCity,
    documentValues.issuingPartyPin,
    documentValues.beneficiaryPartyCode,
    documentValues.beneficiaryPartyName,
    documentValues.beneficiaryPartyAddress1,
    documentValues.beneficiaryPartyAddress2,
    documentValues.beneficiaryPartyCity,
    documentValues.beneficiaryPartyPin,
    documentValues.fileType,
    documentValues.icegateId
  ].some(Boolean)

  const [showCustomDetails, setShowCustomDetails] = useState(hasCustomValues)

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-3">
      <div className="mb-1 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">Document {index + 1}</h3>
        <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onRemove}>
          Remove
        </Button>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <span className="mb-1 block text-sm font-medium text-gray-700">Document type code</span>
          <AsyncPartySelect
            name={`documents.${index}.documentTypeCode`}
            placeholder="Search document type..."
            fetchOptions={(query) => {
              const q = query.toLowerCase().trim()
              return Promise.resolve(
                documentCodes
                  .filter((doc) => doc.label.toLowerCase().includes(q) || doc.value.toLowerCase().includes(q))
                  .map((doc) => ({ value: doc.value, label: doc.label }))
              )
            }}
            getInitialLabel={(val) => {
              const found = documentCodes.find((doc) => doc.value === val || doc.label === val)
              return Promise.resolve(found ? found.label : val)
            }}
          />
        </div>
        <Input label="Image reference number" {...register(`documents.${index}.imageReferenceNumber`)} />
        <Input label="Issue date" type={dateType} {...register(`documents.${index}.documentIssueDate`)} />
      </div>
      <Advanced
        title="Issuing party and ICEGATE details"
        open={showCustomDetails}
        onToggle={(isOpen) => setShowCustomDetails(isOpen)}>
        <div className="mb-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Reference number" {...register(`documents.${index}.documentReferenceNumber`)} />
          <Input label="Expiry date" type={dateType} {...register(`documents.${index}.documentExpiryDate`)} />
          <Input label="Invoice serial number" type="number" {...register(`documents.${index}.invoiceSerialNumber`)} />
          <Input label="Item serial number" type="number" {...register(`documents.${index}.itemSerialNumber`)} />
          <div>
            <span className="mb-1 block text-sm font-medium text-gray-700">File type</span>
            <AsyncPartySelect
              name={`documents.${index}.fileType`}
              placeholder="Search file type..."
              className="bg-transparent"
              fetchOptions={(query) => {
                const q = query.toLowerCase().trim()
                return Promise.resolve(
                  options.documentFileTypes.filter(
                    (doc) => doc.label.toLowerCase().includes(q) || doc.value.toLowerCase().includes(q)
                  )
                )
              }}
              getInitialLabel={(val) => {
                const found = options.documentFileTypes.find((doc) => doc.value === val || doc.label === val)
                return Promise.resolve(found ? found.label : val)
              }}
            />
          </div>
          <Input label="Place of issue" {...register(`documents.${index}.placeOfIssue`)} />
        </div>

        <div className="flex flex-col gap-4">
          <Advanced title="Issuing & Beneficiary">
            <div className="flex flex-col gap-6 pt-2">
              <div>
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Issuing Details</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input label="Issuing party code" {...register(`documents.${index}.issuingPartyCode`)} />
                  <Input label="Issuing party name" {...register(`documents.${index}.issuingPartyName`)} />
                  <Input label="Issuing address line 1" {...register(`documents.${index}.issuingPartyAddress1`)} />
                  <Input label="Issuing address line 2" {...register(`documents.${index}.issuingPartyAddress2`)} />
                  <Input label="Issuing city" {...register(`documents.${index}.issuingPartyCity`)} />
                  <Input label="Issuing postal code" {...register(`documents.${index}.issuingPartyPin`)} />
                </div>
              </div>

              <div className="border-t border-gray-100 pt-5">
                <h3 className="mb-3 text-sm font-semibold text-gray-900">Beneficiary Details</h3>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Input label="Beneficiary code" {...register(`documents.${index}.beneficiaryPartyCode`)} />
                  <Input label="Beneficiary name" {...register(`documents.${index}.beneficiaryPartyName`)} />
                  <Input
                    label="Beneficiary address line 1"
                    {...register(`documents.${index}.beneficiaryPartyAddress1`)}
                  />
                  <Input
                    label="Beneficiary address line 2"
                    {...register(`documents.${index}.beneficiaryPartyAddress2`)}
                  />
                  <Input label="Beneficiary city" {...register(`documents.${index}.beneficiaryPartyCity`)} />
                  <Input label="Beneficiary postal code" {...register(`documents.${index}.beneficiaryPartyPin`)} />
                </div>
              </div>
            </div>
          </Advanced>
        </div>
      </Advanced>
    </div>
  )
}

function BillEditor({ bill }: { bill?: SavedBill }) {
  const { exporters, businesses } = useDemoData()
  const formCtx = useForm<ShippingBillFormValues>(shippingBillFormSchema, {
    defaultValues: bill?.values ?? emptyBill()
  })
  const { register, control, setValue, watch, formState } = formCtx.hooks
  const exporterId = watch('exporterId')
  const consigneeId = watch('consigneeId')
  const loadingPort = watch('loadingPort')
  const finalDestinationPort = watch('finalDestinationPort')
  const { fields: invoices, append: addInvoice, remove: removeInvoice } = useFieldArray({ control, name: 'invoices' })
  const {
    fields: containers,
    append: addContainer,
    remove: removeContainer
  } = useFieldArray({ control, name: 'containers' })
  const {
    fields: packingRanges,
    append: addPackingRange,
    remove: removePackingRange
  } = useFieldArray({ control, name: 'packingRanges' })
  const {
    fields: documents,
    append: addDocument,
    remove: removeDocument
  } = useFieldArray({ control, name: 'documents' })
  const { fields: licenses, append: addLicense, remove: removeLicense } = useFieldArray({ control, name: 'licenses' })
  const [activeTab, setActiveTab] = useState('details')
  const [formOptions, setFormOptions] = useState<ShippingBillFormOptions>()
  const [optionsState, setOptionsState] = useState<'loading' | 'ready' | 'error'>('loading')
  const [optionsRetry, setOptionsRetry] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [draftId, setDraftId] = useState<number | undefined>(bill?.id)
  const [quickAdd, setQuickAdd] = useState<QuickAdd | null>(null)
  const [quickBranch, setQuickBranch] = useState<QuickBranch | null>(null)
  const [marksAndNumbersOptions, setMarksAndNumbersOptions] = useState<MarksAndNumbersOption[]>([])
  const [marksAndNumbersState, setMarksAndNumbersState] = useState<'idle' | 'loading' | 'ready' | 'empty' | 'error'>(
    'idle'
  )
  const previousExporterId = useRef(exporterId)
  const consigneeOptions = businesses.filter((business) => business.isConsignee || String(business.id) === consigneeId)

  useEffect(() => {
    let active = true
    setOptionsState('loading')
    void loadShippingBillFormOptions()
      .then((options) => {
        if (!active) return
        setFormOptions(options)
        setOptionsState('ready')
      })
      .catch(() => {
        if (active) setOptionsState('error')
      })
    return () => {
      active = false
    }
  }, [optionsRetry])

  useEffect(() => {
    if (previousExporterId.current !== exporterId) {
      previousExporterId.current = exporterId
      setValue('marksAndNumbers', '', { shouldValidate: true })
    }

    let cancelled = false
    setMarksAndNumbersOptions([])
    setMarksAndNumbersState(exporterId ? 'loading' : 'idle')
    if (exporterId) {
      void getMarksAndNumbersOptions(exporterId)
        .then((options) => {
          if (cancelled) return
          setMarksAndNumbersOptions(options)
          setMarksAndNumbersState(options.length ? 'ready' : 'empty')
        })
        .catch(() => {
          if (cancelled) return
          setMarksAndNumbersOptions([])
          setMarksAndNumbersState('error')
        })
    }

    return () => {
      cancelled = true
    }
  }, [setValue, exporterId])

  useEffect(() => {
    if (!formState.submitCount || !Object.keys(formState.errors).length) return
    toast.error('Please check the required fields')
    if (
      [
        'jobDate',
        'exporterId',
        'exporterBranchId',
        'consigneeId',
        'consigneeBranchId',
        'loadingPort',
        'finalDestinationPort'
      ].some((field) => field in formState.errors)
    )
      setActiveTab('details')
    else if (formState.errors.invoices) setActiveTab('invoices')
    else if (
      formState.errors.containers ||
      formState.errors.packingRanges ||
      formState.errors.documents ||
      formState.errors.licenses
    )
      setActiveTab('documents')
    // else: keep user on whichever tab they submitted from
  }, [formState.submitCount, formState.errors])

  async function handleSave(data: ShippingBillFormValues) {
    setIsSaving(true)
    try {
      const saved = await submitShippingBill(data, draftId)
      setDraftId(saved.id)
      toast.success(bill ? 'Shipping bill updated' : 'Shipping bill created')
      navigate(routes.toShippingBillEdit(saved.id))
    } catch {
      toast.error('Failed to save shipping bill')
    } finally {
      setIsSaving(false)
    }
  }

  async function handleDraftSave(values: ShippingBillFormValues) {
    setIsSaving(true)
    try {
      const saved = await saveShippingBillDraft(values, draftId)
      setDraftId(saved.id)
      return saved
    } catch {
      toast.error('Failed to save draft')
      return undefined
    } finally {
      setIsSaving(false)
    }
  }

  function handleQuickSaved(party: Exporter | Business) {
    const branchId = party.branches[0]?.id
    if (!quickAdd || !branchId) return
    if (quickAdd.kind === 'exporter') {
      setValue('exporterId', String(party.id), { shouldValidate: true })
      setValue('exporterBranchId', String(branchId), { shouldValidate: true })
    } else if (quickAdd.role === 'consignee') {
      setValue('consigneeId', String(party.id), { shouldValidate: true })
      setValue('consigneeBranchId', String(branchId), { shouldValidate: true })
    } else if (quickAdd.role === 'itemThirdParty' && quickAdd.invoiceIndex != null && quickAdd.itemIndex != null) {
      setValue(`invoices.${quickAdd.invoiceIndex}.items.${quickAdd.itemIndex}.itemThirdPartyId`, String(party.id), {
        shouldValidate: true
      })
      setValue(
        `invoices.${quickAdd.invoiceIndex}.items.${quickAdd.itemIndex}.itemThirdPartyBranchId`,
        String(branchId),
        { shouldValidate: true }
      )
    } else if (quickAdd.invoiceIndex != null) {
      const field = quickAdd.role === 'buyer' ? 'buyer' : 'thirdParty'
      setValue(`invoices.${quickAdd.invoiceIndex}.${field}Id`, String(party.id), { shouldValidate: true })
      setValue(`invoices.${quickAdd.invoiceIndex}.${field}BranchId`, String(branchId), { shouldValidate: true })
    }
  }

  if (optionsState === 'loading') {
    return (
      <div className="p-6 text-sm text-gray-500" role="status">
        Loading shipping bill options...
      </div>
    )
  }

  if (optionsState === 'error' || !formOptions) {
    return (
      <div className="flex items-center gap-3 p-6 text-sm text-red-700" role="alert">
        <span>Shipping bill options could not be loaded.</span>
        <Button type="button" variant="outline" onClick={() => setOptionsRetry((attempt) => attempt + 1)}>
          Retry
        </Button>
      </div>
    )
  }

  const {
    portOptions,
    stateOptions,
    cargoOptions,
    weightUnits,
    sealTypes,
    nfeiCategoryOptions,
    containerSizes,
    containerSealTypes,
    goodsSourceOptions
  } = formOptions

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button className="mb-2 text-sm text-gray-500 hover:underline" onClick={() => navigate(routes.dashboard)}>
            ← Shipping bills
          </button>
          <h1 className="text-2xl font-semibold text-gray-950">
            {bill ? `Edit shipping bill #${bill.id}` : 'New shipping bill'}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Enter the everyday details first. Open advanced sections only when needed.
          </p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        {workflowSteps.map((step, index) => {
          const isShippingBill = step.id === 'shipping-bill'
          return (
            <div
              key={step.id}
              className={`rounded-lg border p-3 ${
                isShippingBill ? 'border-primary-300 bg-primary-50 dark:text-black' : 'border-gray-200 bg-gray-50'
              }`}>
              <div className={`flex items-center gap-2 text-sm font-medium ${isShippingBill ? 'dark:text-black' : ''}`}>
                <span className="flex size-6 items-center justify-center rounded-full bg-white text-xs">
                  {index + 1}
                </span>
                {step.title}
              </div>
              <p className={`ml-8 text-xs text-gray-500 ${isShippingBill ? 'dark:text-black' : ''}`}>
                {step.description}
              </p>
            </div>
          )
        })}
      </div>
      <Form ctx={formCtx} handleSubmit={handleSave} className="shipping-bill-form space-y-5">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(String(value))}>
          <TabsList className="flex w-full justify-start overflow-x-auto">
            <TabsTrigger value="details">1. Details</TabsTrigger>
            <TabsTrigger value="invoices">2. Invoices & goods</TabsTrigger>
            <TabsTrigger value="documents">3. Others</TabsTrigger>
          </TabsList>

          <PersistentTab value="details" activeTab={activeTab} className="space-y-4">
            <Card>
              <CardHeader title="Shipment basics" description="Parties and route are the core details for this bill." />
              <CardContent className="space-y-5">
                <PartyFields
                  formCtx={formCtx}
                  ownerName="exporterId"
                  branchName="exporterBranchId"
                  label="Exporter"
                  kind="exporter"
                  parties={exporters.filter((item) => !item.disabled || String(item.id) === exporterId)}
                  onQuickAdd={() => setQuickAdd({ kind: 'exporter' })}
                  onAddBranch={(ownerId) =>
                    setQuickBranch({ kind: 'exporter', ownerId, branchName: 'exporterBranchId' })
                  }
                />
                <PartyFields
                  formCtx={formCtx}
                  ownerName="consigneeId"
                  branchName="consigneeBranchId"
                  label="Consignee"
                  kind="business"
                  parties={consigneeOptions}
                  onQuickAdd={() => setQuickAdd({ kind: 'business', role: 'consignee' })}
                  onAddBranch={(ownerId) =>
                    setQuickBranch({ kind: 'business', ownerId, branchName: 'consigneeBranchId' })
                  }
                />

                <div className="border-t border-gray-200 pt-5">
                  <SectionHeading title="Route" />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <span className="mb-1 block text-sm font-medium">Port of loading</span>
                      <AsyncPartySelect
                        name="loadingPort"
                        placeholder="Select Indian port"
                        rules={{ required: true }}
                        fetchOptions={async (query) => {
                          const res = await partyMockService.searchLoadingPorts(query)
                          return res.map((port) => ({
                            value: port.code,
                            label: `${port.name} · ${port.code}`,
                            sublabel: `Country: ${port.countryCode}`
                          }))
                        }}
                        getInitialLabel={async (code) => {
                          const port = await partyMockService.getPortByCode(code)
                          return port ? `${port.name} · ${port.code}` : code
                        }}
                      />
                    </div>
                    <div>
                      <span className="mb-1 block text-sm font-medium">Final destination port</span>
                      <AsyncPartySelect
                        name="finalDestinationPort"
                        placeholder="Select destination"
                        rules={{ required: true }}
                        fetchOptions={async (query) => {
                          const res = await partyMockService.searchDestinationPorts(query)
                          return res.map((port) => ({
                            value: port.code,
                            label: `${port.name} · ${port.code}`,
                            sublabel: `Country: ${port.countryCode}`
                          }))
                        }}
                        getInitialLabel={async (code) => {
                          const port = await partyMockService.getPortByCode(code)
                          return port ? `${port.name} · ${port.code}` : code
                        }}
                      />
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    Countries are derived from the port codes when saved: {portCountry(loadingPort) || '—'} →{' '}
                    {portCountry(finalDestinationPort) || '—'}.
                  </p>
                </div>
                <Advanced title="Regulatory and route exceptions">
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Select<ShippingBillFormValues>
                      label="Discharge port"
                      name="dischargePort"
                      options={portOptions}
                      placeholder="Defaults to destination"
                    />
                    <Select<ShippingBillFormValues>
                      label="Origin state"
                      name="originStateCode"
                      options={stateOptions}
                      placeholder="Defaults to Branch State Code"
                    />
                    <div></div>
                    <Select<ShippingBillFormValues>
                      label="NFEI category"
                      name="nfeiCategory"
                      options={nfeiCategoryOptions}
                      placeholder="Not applicable"
                    />
                    <Input label="RBI waiver number" {...register('rbiWaiverNumber')} />
                    <Input label="RBI waiver date" type={dateType} {...register('rbiWaiverDate')} />
                  </div>
                </Advanced>

                <div className="border-t border-gray-200 pt-5">
                  <SectionHeading title="Package Detail" />
                  <div className="grid gap-4 pb-4 sm:grid-cols-2 lg:grid-cols-4">
                    <Select<ShippingBillFormValues>
                      label="Nature of cargo"
                      name="natureOfCargo"
                      options={cargoOptions}
                    />
                    <Input label="Gross weight" type="number" {...register('grossWeight')} />
                    <Input label="Net weight" type="number" {...register('netWeight')} />
                    <Select<ShippingBillFormValues> label="Weight unit" name="measurementUnit" options={weightUnits} />
                    <Input label="Total packages" type="number" {...register('totalPackages')} />
                    <Select<ShippingBillFormValues>
                      label="Marks and numbers"
                      name="marksAndNumbers"
                      options={marksAndNumbersOptions}
                      placeholder={
                        marksAndNumbersState === 'idle'
                          ? 'Select exporter first'
                          : marksAndNumbersState === 'loading'
                            ? 'Loading marks and numbers...'
                            : marksAndNumbersState === 'error'
                              ? 'Could not load marks and numbers'
                              : marksAndNumbersState === 'empty'
                                ? 'No marks and numbers available'
                                : 'Select marks and numbers'
                      }
                      disabled={marksAndNumbersState !== 'ready'}
                      wrapClass="sm:col-span-3"
                    />
                  </div>
                  <Advanced title="Additional Details">
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Select<ShippingBillFormValues>
                        label="Seal type"
                        name="sealType"
                        options={sealTypes}
                        placeholder="Select if relevant"
                      />
                      {containers.length === 0 && (
                        <Input label="Number of containers" type="number" {...register('numberOfContainers')} />
                      )}
                      <Input label="Loose packets" type="number" {...register('loosePackets')} />
                      <Input label="MAWB number" {...register('mawbNumber')} />
                      <Input label="HAWB number" {...register('hawbNumber')} />
                    </div>
                  </Advanced>
                </div>
              </CardContent>
            </Card>
          </PersistentTab>

          <PersistentTab value="invoices" activeTab={activeTab} className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-semibold">Invoices & goods</h2>
                <p className="text-sm text-gray-500">One invoice and one item are ready to fill in.</p>
              </div>
              <Button variant="outline" onClick={() => addInvoice(emptyInvoice())}>
                + Add invoice
              </Button>
            </div>
            {invoices.map((field, index) => (
              <InvoiceEditor
                key={field.id}
                formCtx={formCtx}
                index={index}
                businesses={businesses}
                options={formOptions}
                onQuickAdd={(role, invoiceIndex, itemIndex) =>
                  setQuickAdd({ kind: 'business', role, invoiceIndex, itemIndex })
                }
                onAddBranch={(ownerId, branchName) => setQuickBranch({ kind: 'business', ownerId, branchName })}
                onRemove={() => removeInvoice(index)}
                canRemove={invoices.length > 1}
              />
            ))}
          </PersistentTab>

          <PersistentTab value="documents" activeTab={activeTab} className="space-y-4">
            <Card>
              <CardHeader title="Cargo & Package Detail" />
              <CardContent className="space-y-5">
                <div className="mb-3 flex items-center justify-between">
                  <SectionHeading
                    title={`Containers (${containers.length})`}
                    description="Add only when the cargo is containerized."
                  />
                  <Button size="sm" variant="outline" onClick={() => addContainer({ containerNumber: '' })}>
                    + Add container
                  </Button>
                </div>
                <div className="space-y-3">
                  {containers.map((field, index) => (
                    <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                      <div className="mb-3 flex justify-between">
                        <h3 className="text-sm font-semibold">Container {index + 1}</h3>
                        <Button size="sm" variant="ghost" onClick={() => removeContainer(index)}>
                          Remove
                        </Button>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Input label="Container number" {...register(`containers.${index}.containerNumber`)} />
                        <Select<ShippingBillFormValues>
                          label="Size"
                          name={`containers.${index}.containerSize`}
                          options={containerSizes}
                          placeholder="Select size"
                        />
                        <Input label="Seal number" {...register(`containers.${index}.exciseSealNumber`)} />
                        <Input label="Seal date" type={dateType} {...register(`containers.${index}.sealDate`)} />
                        <Select<ShippingBillFormValues>
                          label="Seal type"
                          name={`containers.${index}.sealType`}
                          options={containerSealTypes}
                          placeholder="Select if needed"
                        />
                        <Input label="Seal device ID" {...register(`containers.${index}.sealDeviceId`)} />
                        <Input
                          label="Movement document type"
                          {...register(`containers.${index}.movementDocumentType`)}
                        />
                        <Input
                          label="Movement document number"
                          {...register(`containers.${index}.movementDocumentNumber`)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <Advanced title={`Packing list ranges (${packingRanges.length})`}>
                  <div className="space-y-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => addPackingRange({ packingNumberFrom: '', packingNumberTo: '' })}>
                      + Add packing range
                    </Button>
                    {packingRanges.map((field, index) => (
                      <div key={field.id} className="rounded-lg border border-gray-200 p-3">
                        <div className="mb-3 flex items-center justify-between">
                          <span className="text-sm font-medium">Range {index + 1}</span>
                          <Button size="sm" variant="ghost" onClick={() => removePackingRange(index)}>
                            Remove
                          </Button>
                        </div>
                        <div className="grid gap-4 sm:grid-cols-3">
                          <Input
                            label="Package from"
                            type="number"
                            {...register(`packingRanges.${index}.packingNumberFrom`)}
                          />
                          <Input
                            label="Package to"
                            type="number"
                            {...register(`packingRanges.${index}.packingNumberTo`)}
                          />
                          <Input label="Packing code" {...register(`packingRanges.${index}.packingCode`)} />
                        </div>
                      </div>
                    ))}
                  </div>
                </Advanced>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-950">Supporting documents</h3>
                  <p className="mt-1 text-sm text-gray-500">Add references when required for this shipment.</p>
                </div>
                {documents.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => addDocument(emptyDocument())}>
                    + Add document
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {documents.length === 0 && (
                  <Button variant="outline" size="sm" onClick={() => addDocument(emptyDocument())}>
                    + Add document
                  </Button>
                )}
                {documents.map((field, index) => (
                  <DocumentItem
                    key={field.id}
                    formCtx={formCtx}
                    index={index}
                    options={formOptions}
                    onRemove={() => removeDocument(index)}
                  />
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-gray-950">Licences</h3>
                  <p className="mt-1 text-sm text-gray-500">Only enter these for schemes that require a licence.</p>
                </div>
                {licenses.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => addLicense({ registrationNumber: '' })}>
                    + Add licence
                  </Button>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {licenses.length === 0 && (
                  <Button variant="outline" size="sm" onClick={() => addLicense({ registrationNumber: '' })}>
                    + Add licence
                  </Button>
                )}
                {licenses.map((field, index) => (
                  <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                    <div className="mb-3 flex justify-between">
                      <h3 className="text-sm font-semibold">Licence {index + 1}</h3>
                      <Button size="sm" variant="ghost" onClick={() => removeLicense(index)}>
                        Remove
                      </Button>
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <Input label="Registration number" {...register(`licenses.${index}.registrationNumber`)} />
                      <Input
                        label="Registration date"
                        type={dateType}
                        {...register(`licenses.${index}.registrationDate`)}
                      />
                      <Input
                        label="Invoice serial number"
                        type="number"
                        {...register(`licenses.${index}.invoiceSerialNumber`)}
                      />
                      <Input
                        label="Item serial number"
                        type="number"
                        {...register(`licenses.${index}.itemSerialNumber`)}
                      />
                      <Input
                        label="Licence serial number"
                        type="number"
                        {...register(`licenses.${index}.licenseSerialNumber`)}
                      />
                      <Input label="Item serial, Part E" {...register(`licenses.${index}.itemSerialNumberPartE`)} />
                      <Input label="Item serial, Part C" {...register(`licenses.${index}.itemSerialNumberPartC`)} />
                      <Input
                        label="Licence quantity"
                        type="number"
                        {...register(`licenses.${index}.licenseQuantity`)}
                      />
                      <Input
                        label="Export quantity"
                        type="number"
                        {...register(`licenses.${index}.licenseExportQuantity`)}
                      />
                      <Select<ShippingBillFormValues>
                        label="Goods source"
                        name={`licenses.${index}.indigenousOrImported`}
                        options={goodsSourceOptions}
                        placeholder="Select if needed"
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </PersistentTab>
        </Tabs>
        <div className="flex flex-wrap justify-between gap-2 border-t border-gray-200 pt-4">
          <Button variant="outline" type="button" onClick={() => navigate(routes.dashboard)}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {activeTab !== 'details' && (
              <Button
                variant="outline"
                type="button"
                disabled={isSaving}
                onClick={async () => {
                  const current = formCtx.hooks.getValues()
                  const saved = await handleDraftSave(current)
                  if (!saved) return
                  setActiveTab(activeTab === 'documents' ? 'invoices' : 'details')
                }}>
                Previous
              </Button>
            )}
            {activeTab !== 'documents' ? (
              <Button
                type="button"
                disabled={isSaving}
                onClick={async (e) => {
                  e.preventDefault()
                  const current = formCtx.hooks.getValues()
                  const saved = await handleDraftSave(current)
                  if (!saved) return
                  toast.success('Details saved')
                  setActiveTab(activeTab === 'details' ? 'invoices' : 'documents')
                }}>
                Save & Next
              </Button>
            ) : (
              <Button type="submit" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save changes'}
              </Button>
            )}
          </div>
        </div>
      </Form>
      {quickAdd && (
        <PartyDialog
          key={`${quickAdd.kind}-${quickAdd.role ?? 'exporter'}-${quickAdd.invoiceIndex ?? 0}`}
          kind={quickAdd.kind}
          initialRole={quickAdd.role === 'itemThirdParty' ? 'thirdParty' : quickAdd.role}
          onClose={() => setQuickAdd(null)}
          onSaved={handleQuickSaved}
        />
      )}
      {quickBranch && (
        <BranchDialog
          key={`${quickBranch.kind}-${quickBranch.ownerId}`}
          kind={quickBranch.kind}
          ownerId={quickBranch.ownerId}
          onClose={() => setQuickBranch(null)}
          onSaved={(branch: Branch) => setValue(quickBranch.branchName, String(branch.id), { shouldValidate: true })}
        />
      )}
    </div>
  )
}

export default function ShippingBillPage() {
  const { id } = useParams<{ id?: string }>()
  const [bill, setBill] = useState<SavedBill>()
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'not-found' | 'error'>(id ? 'loading' : 'ready')
  const [loadAttempt, setLoadAttempt] = useState(0)

  useEffect(() => {
    if (!id) {
      setBill(undefined)
      setLoadState('ready')
      return
    }

    let active = true
    setLoadState('loading')
    void loadShippingBill(Number(id))
      .then((loadedBill) => {
        if (!active) return
        setBill(loadedBill)
        setLoadState(loadedBill ? 'ready' : 'not-found')
      })
      .catch(() => {
        if (active) setLoadState('error')
      })

    return () => {
      active = false
    }
  }, [id, loadAttempt])

  if (loadState === 'loading') {
    return (
      <div className="p-6 text-sm text-gray-500" role="status">
        Loading shipping bill...
      </div>
    )
  }

  if (loadState === 'error') {
    return (
      <div className="flex items-center gap-3 p-6 text-sm text-red-700" role="alert">
        <span>Shipping bill could not be loaded.</span>
        <Button type="button" variant="outline" onClick={() => setLoadAttempt((attempt) => attempt + 1)}>
          Retry
        </Button>
      </div>
    )
  }

  if (loadState === 'not-found')
    return (
      <div className="space-y-3">
        <h1 className="text-xl font-semibold">Shipping bill not found</h1>
        <Button onClick={() => navigate(routes.dashboard)}>Back to list</Button>
      </div>
    )
  return <BillEditor key={id ?? 'new'} bill={bill} />
}
