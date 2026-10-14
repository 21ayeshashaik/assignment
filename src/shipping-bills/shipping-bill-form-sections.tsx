import { useFieldArray } from 'core/form'
import { RrCaretDown } from 'icons/rr/fi-rr-caret-down'
import { useEffect, useRef, useState } from 'react'
import { Button } from 'ui/basic/button'
import { Card, CardContent, CardHeader } from 'ui/basic/card'
import { getFormContext, RegisterOptions, useController } from 'ui/form'
import { Checkbox } from 'ui/inputs/checkbox'
import { InputError } from 'ui/inputs/error'
import { Input } from 'ui/inputs/input'
import { Select } from 'ui/inputs/select'
import { Popover, PopoverContent, PopoverTrigger } from 'ui/interactive/popover'
import { PopoverContext } from 'ui/interactive/popover-context'
import { clsx, getContext } from 'ui/utils'
import { Business, emptyItem, Exporter, invoiceTotal, lineTotal, ShippingBillFormValues } from './model'
import { partyMockService } from './party-mock-service'
import type { ShippingBillFormOptions } from './shipping-bill-form-service'
import type { BillFormContext, BranchPath } from './shipping-bill-form-types'

const dateType = 'date' as 'text'
export function SectionHeading({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-base font-semibold text-gray-950">{title}</h2>
      {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
    </div>
  )
}

export function Advanced({
  title,
  children,
  open,
  onToggle
}: {
  title: string
  children: React.ReactNode
  open?: boolean
  onToggle?: (isOpen: boolean) => void
}) {
  return (
    <details
      className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"
      open={open}
      onToggle={(e) => onToggle?.(e.currentTarget.open)}>
      <summary className="cursor-pointer text-sm font-medium text-gray-700">{title}</summary>
      <div className="mt-4">{children}</div>
    </details>
  )
}

interface PersistentTabProps {
  value: string
  activeTab: string
  children: React.ReactNode
  className?: string
}

// Keep fields registered while another tab is open so RHF validates the entire bill on submit.
export function PersistentTab({ value, activeTab, children, className }: PersistentTabProps) {
  return (
    <div role="tabpanel" hidden={activeTab !== value} className={`mt-3 ${className}`}>
      {children}
    </div>
  )
}

interface AsyncOption {
  value: string
  label: string
  sublabel?: string
}

interface AsyncPartySelectProps {
  name: string
  placeholder?: string
  disabled?: boolean
  className?: string
  rules?: RegisterOptions
  deps?: React.DependencyList
  fetchOptions: (query: string) => Promise<AsyncOption[]>
  getInitialLabel?: (id: string) => Promise<string>
}

export function AsyncPartySelect({
  name,
  placeholder = 'Search...',
  disabled = false,
  className,
  rules,
  deps = [],
  fetchOptions,
  getInitialLabel
}: AsyncPartySelectProps) {
  const ctx = getFormContext()
  const {
    field: { onChange, value, ref }
  } = useController({
    name,
    control: ctx.hooks.control,
    rules: ctx.schema.shape[name] ?? rules,
    disabled
  })

  const [query, setQuery] = useState('')
  const [options, setOptions] = useState<AsyncOption[]>([])
  const [loading, setLoading] = useState(false)
  const [loadError, setLoadError] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const fetchOptionsRef = useRef(fetchOptions)
  fetchOptionsRef.current = fetchOptions

  const getInitialLabelRef = useRef(getInitialLabel)
  getInitialLabelRef.current = getInitialLabel

  // Fetch label when selected value changes or on mount
  useEffect(() => {
    let active = true
    if (value) {
      if (getInitialLabelRef.current) {
        void getInitialLabelRef
          .current(String(value))
          .then((lbl) => {
            if (active && lbl) setSelectedLabel(lbl)
          })
          .catch(() => {
            if (active) setSelectedLabel(String(value))
          })
      } else {
        const found = options.find((o) => o.value === String(value))
        if (found) setSelectedLabel(found.label)
      }
    } else {
      setSelectedLabel('')
    }
    return () => {
      active = false
    }
  }, [value, ...deps])

  // Fetch search results asynchronously whenever query changes or popover opens
  useEffect(() => {
    if (!isOpen && !query) return

    let active = true
    setLoading(true)
    setLoadError(false)
    const timer = setTimeout(() => {
      void fetchOptionsRef
        .current(query)
        .then((results) => {
          if (active) {
            setOptions(results)
            setLoading(false)
          }
        })
        .catch(() => {
          if (active) {
            setOptions([])
            setLoadError(true)
            setLoading(false)
          }
        })
    }, 200)

    return () => {
      active = false
      clearTimeout(timer)
    }
  }, [query, isOpen, ...deps])

  return (
    <div>
      <input type="hidden" name={name} value={value ?? ''} ref={ref} disabled={disabled} />
      <Popover placement="bottom-start" fallbackPlacements={['top-start']} onOpenCallback={(open) => setIsOpen(open)}>
        <PopoverTrigger
          className={clsx(
            'outline-focus-select group flex w-full cursor-pointer items-center justify-between rounded border border-gray-200 pr-2 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-50',
            `${className ?? 'bg-white'} ${disabled ? 'cursor-not-allowed opacity-50' : ''}`
          )}
          disabled={disabled}>
          <div className="flex items-center p-2 text-sm">
            <span className={selectedLabel ? 'font-medium text-gray-900' : 'text-gray-400'}>
              {selectedLabel || placeholder}
            </span>
          </div>
          <RrCaretDown className="size-4 text-gray-400 transition-transform group-data-[state=open]:rotate-180" />
        </PopoverTrigger>
        <InputError<ShippingBillFormValues> name={name as never} />
        <PopoverContent className="overflow-hidden rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="border-b border-gray-100 p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Type to search..."
              className="focus:border-primary-500 focus:ring-primary-500 w-full rounded border border-gray-200 px-2.5 py-1.5 text-sm outline-none focus:ring-1"
              autoFocus
            />
          </div>
          <div className="max-h-56 overflow-y-auto p-1">
            {loading ? (
              <div className="p-3 text-center text-xs text-gray-500">Searching mock service...</div>
            ) : loadError ? (
              <div className="p-3 text-center text-xs text-red-600" role="status">
                Unable to load results. Close and retry.
              </div>
            ) : options.length === 0 ? (
              <div className="p-3 text-center text-xs text-gray-400">No matching results found</div>
            ) : (
              options.map((opt) => (
                <PopoverOptionItem
                  key={opt.value}
                  option={opt}
                  isSelected={String(value) === opt.value}
                  onSelect={(selected) => {
                    onChange(selected.value)
                    ctx.hooks.setValue(name, selected.value, {
                      shouldValidate: true,
                      shouldDirty: true,
                      shouldTouch: true
                    })
                    setSelectedLabel(selected.label)
                    setQuery('')
                  }}
                />
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}

function PopoverOptionItem({
  option,
  isSelected,
  onSelect
}: {
  option: AsyncOption
  isSelected: boolean
  onSelect: (opt: AsyncOption) => void
}) {
  const { setOpen } = getContext(PopoverContext)

  return (
    <div
      onClick={() => {
        onSelect(option)
        setOpen(false)
      }}
      className={clsx(
        'flex cursor-pointer flex-col rounded p-2 text-sm transition-colors',
        isSelected ? 'bg-primary-50 text-primary-900 font-semibold' : 'text-gray-950 hover:bg-gray-100'
      )}>
      <span>{option.label}</span>
      {option.sublabel && <span className="text-xs text-gray-500">{option.sublabel}</span>}
    </div>
  )
}

export function PartyFields({
  formCtx,
  ownerName,
  branchName,
  label,
  kind,
  parties,
  required = true,
  onAddBranch,
  onQuickAdd
}: {
  formCtx: BillFormContext
  ownerName:
    | 'exporterId'
    | 'consigneeId'
    | `invoices.${number}.buyerId`
    | `invoices.${number}.thirdPartyId`
    | `invoices.${number}.items.${number}.itemThirdPartyId`
  branchName: BranchPath
  label: string
  kind: 'exporter' | 'business'
  parties: (Exporter | Business)[]
  required?: boolean
  onAddBranch: (ownerId: number) => void
  onQuickAdd: () => void
}) {
  const ownerId = formCtx.hooks.watch(ownerName)
  const owner = parties.find((party) => String(party.id) === ownerId)

  useEffect(() => {
    const selectedBranch = formCtx.hooks.getValues(branchName)
    if (
      selectedBranch &&
      owner &&
      owner.branches.length > 0 &&
      !owner.branches.some((branch) => String(branch.id) === selectedBranch)
    ) {
      formCtx.hooks.setValue(branchName, '', { shouldValidate: true })
    }
  }, [branchName, formCtx.hooks, owner])

  return (
    <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-medium">{label}</span>
          <button type="button" className="text-primary-700 text-xs font-medium hover:underline" onClick={onQuickAdd}>
            + Add new
          </button>
        </div>
        <AsyncPartySelect
          name={ownerName}
          placeholder={`Search & select ${kind}...`}
          rules={{ required }}
          fetchOptions={async (query) => {
            if (kind === 'exporter') {
              const res = await partyMockService.searchExporters(query)
              return res.map((item) => ({
                value: String(item.id),
                label: item.name,
                sublabel: item.iec ? `IEC: ${item.iec}` : undefined
              }))
            } else {
              const res = await partyMockService.searchConsignees(query)
              return res.map((item) => ({
                value: String(item.id),
                label: item.name
              }))
            }
          }}
          getInitialLabel={async (id) => {
            if (kind === 'exporter') {
              const item = await partyMockService.getExporterById(id)
              return item ? item.name : ''
            } else {
              const item = await partyMockService.getConsigneeById(id)
              return item ? item.name : ''
            }
          }}
        />
      </div>
      <div>
        <div className="mb-1 flex items-center justify-between gap-2">
          <span className="text-sm font-medium">Branch / address</span>
          {owner && (
            <button
              type="button"
              className="text-primary-700 text-xs font-medium hover:underline"
              onClick={() => onAddBranch(owner.id)}>
              + Add branch
            </button>
          )}
        </div>
        <AsyncPartySelect
          name={branchName}
          placeholder={owner ? 'Search & select branch...' : `Choose ${kind} first`}
          disabled={!owner}
          rules={{ required: required || !!ownerId }}
          deps={[ownerId]}
          fetchOptions={async (query) => {
            if (!ownerId) return []
            if (kind === 'exporter') {
              const res = await partyMockService.searchExporterBranches(ownerId, query)
              return res.map((branch) => ({
                value: String(branch.id),
                label: `${branch.branchName} · ${branch.city}`,
                sublabel: branch.address1
              }))
            } else {
              const res = await partyMockService.searchConsigneeBranches(ownerId, query)
              return res.map((branch) => ({
                value: String(branch.id),
                label: `${branch.branchName} · ${branch.city}`,
                sublabel: branch.address1
              }))
            }
          }}
          getInitialLabel={(id) => {
            const branch = owner?.branches.find((b) => String(b.id) === id)
            return Promise.resolve(branch ? `${branch.branchName} · ${branch.city}` : '')
          }}
        />
      </div>
    </div>
  )
}

export function InvoiceEditor({
  formCtx,
  index,
  businesses,
  options,
  onQuickAdd,
  onAddBranch,
  onRemove,
  canRemove
}: {
  formCtx: BillFormContext
  index: number
  businesses: Business[]
  options: ShippingBillFormOptions
  onQuickAdd: (role: 'buyer' | 'thirdParty' | 'itemThirdParty', invoiceIndex: number, itemIndex?: number) => void
  onAddBranch: (ownerId: number, branchName: BranchPath) => void
  onRemove: () => void
  canRemove: boolean
}) {
  const { register, control, watch } = formCtx.hooks
  const invoiceValues = watch(`invoices.${index}`)
  const {
    fields: items,
    append: addItem,
    remove: removeItem
  } = useFieldArray({ control, name: `invoices.${index}.items` })
  const buyerSame = formCtx.hooks.watch(`invoices.${index}.buyerSameAsConsignee`)
  const {
    currencyOptions,
    contractTypes,
    priceInclusionTypes,
    paymentTypes,
    schemeCodes,
    quantityCodes,
    tradeAgreements,
    igstPaymentOptions,
    accessoryStatusOptions
  } = options
  const buyerOptions = businesses.filter(
    (business) => business.isBuyer || business.id === Number(invoiceValues.buyerId)
  )
  const thirdPartyOptions = businesses.filter(
    (business) => business.isThirdParty || business.id === Number(invoiceValues.thirdPartyId)
  )

  return (
    <Card className="mb-4">
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div>
          <h3 className="font-semibold">Invoice {index + 1}</h3>
        </div>
        {canRemove && (
          <Button size="sm" variant="ghost" onClick={onRemove}>
            Remove invoice
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input label="Invoice number" {...register(`invoices.${index}.invoiceNumber`)} />
          <Input label="Invoice date" type={dateType} {...register(`invoices.${index}.invoiceDate`)} />
          <div className="flex gap-2">
            <div className="w-[100px] shrink-0">
              <Select<ShippingBillFormValues>
                label="Currency"
                name={`invoices.${index}.currency`}
                options={currencyOptions}
                rules={{ required: true }}
              />
            </div>
            <div className="flex-1">
              <Input
                label="Total"
                type="number"
                min={0}
                {...register(`invoices.${index}.invoiceTotal`)}
                placeholder="0.00"
              />
            </div>
          </div>
          <Select<ShippingBillFormValues>
            label="Contract"
            name={`invoices.${index}.contractType`}
            options={contractTypes}
            rules={{ required: true }}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <Checkbox {...register(`invoices.${index}.buyerSameAsConsignee`)} />
          Buyer & consignee are same
        </label>
        {!buyerSame && (
          <PartyFields
            formCtx={formCtx}
            ownerName={`invoices.${index}.buyerId`}
            branchName={`invoices.${index}.buyerBranchId`}
            label="Buyer"
            kind="business"
            parties={buyerOptions}
            required={!buyerSame}
            onQuickAdd={() => onQuickAdd('buyer', index)}
            onAddBranch={(ownerId) => onAddBranch(ownerId, `invoices.${index}.buyerBranchId`)}
          />
        )}

        <div className="space-y-4">
          <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
            <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Freight</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.freightRate`)}
                      className="text-right"
                      disabled={invoiceValues.freightAmount !== '' && invoiceValues.freightAmount != null}
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.freightAmount`)}
                    className="py-1 text-right"
                    disabled={invoiceValues.freightRate !== '' && invoiceValues.freightRate != null}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.freightCurrency`}
                    options={currencyOptions}
                    placeholder={invoiceValues.currency}
                  />
                </div>
              </div>
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Insurance</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.insuranceRate`)}
                      className="text-right"
                      disabled={invoiceValues.insuranceAmount !== '' && invoiceValues.insuranceAmount != null}
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.insuranceAmount`)}
                    className="py-1 text-right"
                    disabled={invoiceValues.insuranceRate !== '' && invoiceValues.insuranceRate != null}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.insuranceCurrency`}
                    options={currencyOptions}
                    placeholder={invoiceValues.currency}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Commission</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.commissionRate`)}
                      className="text-right"
                      disabled={invoiceValues.commissionAmount !== '' && invoiceValues.commissionAmount != null}
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.commissionAmount`)}
                    className="py-1 text-right"
                    disabled={invoiceValues.commissionRate !== '' && invoiceValues.commissionRate != null}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.commissionCurrency`}
                    options={currencyOptions}
                    placeholder={invoiceValues.currency}
                  />
                </div>
              </div>
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Discount</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.discountRate`)}
                      className="text-right"
                      disabled={invoiceValues.discountAmount !== '' && invoiceValues.discountAmount != null}
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.discountAmount`)}
                    className="py-1 text-right"
                    disabled={invoiceValues.discountRate !== '' && invoiceValues.discountRate != null}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.discountCurrency`}
                    options={currencyOptions}
                    placeholder={invoiceValues.currency}
                  />
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 divide-y divide-gray-100 lg:grid-cols-2 lg:divide-x lg:divide-y-0">
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Other Deductions</span>
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      {...register(`invoices.${index}.otherDeductionsRate`)}
                      className="text-right"
                      disabled={
                        invoiceValues.otherDeductionsAmount !== '' && invoiceValues.otherDeductionsAmount != null
                      }
                      placeholder="Rate"
                    />
                    <span className="text-xs text-gray-500">%</span>
                  </div>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.otherDeductionsAmount`)}
                    className="py-1 text-right"
                    disabled={invoiceValues.otherDeductionsRate !== '' && invoiceValues.otherDeductionsRate != null}
                    placeholder="Amount"
                  />
                  <Select<ShippingBillFormValues>
                    name={`invoices.${index}.otherDeductionsCurrency`}
                    options={currencyOptions}
                    placeholder={invoiceValues.currency}
                  />
                </div>
              </div>
              <div className="p-2">
                <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
                  <span className="w-28 shrink-0 font-medium text-gray-900">Packing Charges</span>
                  <Input
                    type="number"
                    {...register(`invoices.${index}.packingCharges`)}
                    className="py-1 text-right"
                    placeholder="Amount"
                  />
                  <span className="w-14 text-sm text-gray-500">—</span>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select<ShippingBillFormValues>
              label="Price includes"
              name={`invoices.${index}.freightInsuranceIncluded`}
              options={priceInclusionTypes}
              placeholder="Select if applicable"
            />
            <Input label="Contract / order number" {...register(`invoices.${index}.contractNumber`)} />
            <Select<ShippingBillFormValues>
              label="Payment type"
              name={`invoices.${index}.natureOfPayment`}
              options={paymentTypes}
              placeholder="Select if applicable"
            />
            <Input label="Payment period (days)" type="number" {...register(`invoices.${index}.periodOfPayment`)} />
          </div>
          <PartyFields
            formCtx={formCtx}
            ownerName={`invoices.${index}.thirdPartyId`}
            branchName={`invoices.${index}.thirdPartyBranchId`}
            label="Third party (optional)"
            kind="business"
            parties={thirdPartyOptions}
            required={false}
            onQuickAdd={() => onQuickAdd('thirdParty', index)}
            onAddBranch={(ownerId) => onAddBranch(ownerId, `invoices.${index}.thirdPartyBranchId`)}
          />
        </div>

        <div className="border-t border-gray-200 pt-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <SectionHeading title="Goods" />
            <Button size="sm" variant="outline" onClick={() => addItem(emptyItem())}>
              + Add item
            </Button>
          </div>
          <div className="space-y-4">
            {items.map((field, itemIndex) => {
              const item = invoiceValues.items[itemIndex] ?? emptyItem()
              return (
                <div key={field.id} className="rounded-lg border border-gray-200 p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <h4 className="text-sm font-semibold">Item {itemIndex + 1}</h4>
                    {items.length > 1 && (
                      <Button size="sm" variant="ghost" onClick={() => removeItem(itemIndex)}>
                        Remove
                      </Button>
                    )}
                  </div>
                  <div className="mb-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                    <Input
                      label="RITC / HS code"
                      {...register(`invoices.${index}.items.${itemIndex}.ritcCode`)}
                      placeholder="e.g. 61091000"
                    />
                    <Select<ShippingBillFormValues>
                      label="Scheme code"
                      name={`invoices.${index}.items.${itemIndex}.schemeCode`}
                      options={schemeCodes}
                      placeholder="Select scheme"
                    />
                    <Input
                      label="Goods description"
                      {...register(`invoices.${index}.items.${itemIndex}.goodsDescription1`)}
                      wrapClass="lg:col-span-4"
                      placeholder="e.g. Cotton T-shirts"
                    />
                    <Input
                      label="Quantity"
                      type="number"
                      {...register(`invoices.${index}.items.${itemIndex}.quantity`)}
                    />
                    <Select<ShippingBillFormValues>
                      label="Unit"
                      name={`invoices.${index}.items.${itemIndex}.unitOfMeasurement`}
                      options={quantityCodes}
                      rules={{ required: true }}
                    />
                    <Input
                      label={`Unit price (${invoiceValues.currency || 'currency'})`}
                      type="number"
                      {...register(`invoices.${index}.items.${itemIndex}.unitPrice`)}
                    />
                    <Input
                      label="Item Total"
                      type="number"
                      placeholder={`${invoiceValues.currency} ${lineTotal(item).toLocaleString(undefined, { maximumFractionDigits: 2 })}`}

                      {...register(`invoices.${index}.items.${itemIndex}.lineTotal`)}
                    />
                    <Select<ShippingBillFormValues>
                      label="IGST payment"
                      name={`invoices.${index}.items.${itemIndex}.igstPaymentStatus`}
                      options={igstPaymentOptions}
                      placeholder="Select if applicable"
                    />
                  </div>
                  {/* Row 3: drawback inputs (conditional) + checkboxes */}
                  <div className="mb-3 flex flex-wrap items-end gap-4">
                    {(() => {
                      const selectedScheme = schemeCodes.find((scheme) => scheme.value === item.schemeCode)
                      const showDrawback = [
                        selectedScheme?.drawback,
                        selectedScheme?.RODTEP,
                        selectedScheme?.ROSCTL
                      ].some(Boolean)
                      return showDrawback ? (
                        <>
                          <div className="w-36">
                            <Input
                              label="Drawback Serial no."
                              {...register(`invoices.${index}.items.${itemIndex}.drawbackSerialNumber`)}
                            />
                          </div>
                          <div className="w-32">
                            <Input
                              label="Drawback Unit"
                              {...register(`invoices.${index}.items.${itemIndex}.drawbackUnit`)}
                            />
                          </div>
                          <div className="w-36">
                            <Input
                              label="Drawback Quantity"
                              type="number"
                              {...register(`invoices.${index}.items.${itemIndex}.drawbackQuantity`)}
                            />
                          </div>
                        </>
                      ) : null
                    })()}
                    <label className="flex items-center gap-2 pb-1 text-sm">
                      <Checkbox {...register(`invoices.${index}.items.${itemIndex}.rewardItem`)} />
                      Claim reward
                    </label>
                    <label className="flex items-center gap-2 pb-1 text-sm">
                      <Checkbox {...register(`invoices.${index}.items.${itemIndex}.thirdPartyItem`)} />
                      Third-party item
                    </label>
                  </div>
                  {item.thirdPartyItem && (
                    <div className="my-4">
                      <PartyFields
                        formCtx={formCtx}
                        ownerName={`invoices.${index}.items.${itemIndex}.itemThirdPartyId`}
                        branchName={`invoices.${index}.items.${itemIndex}.itemThirdPartyBranchId`}
                        label="Item third party"
                        kind="business"
                        parties={businesses.filter(
                          (business) => business.isThirdParty || business.id === Number(item.itemThirdPartyId)
                        )}
                        onQuickAdd={() => onQuickAdd('itemThirdParty', index, itemIndex)}
                        onAddBranch={(ownerId) =>
                          onAddBranch(ownerId, `invoices.${index}.items.${itemIndex}.itemThirdPartyBranchId`)
                        }
                      />
                    </div>
                  )}
                  <Advanced title="Item customs, taxes and incentives">
                    <div className="mb-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Select<ShippingBillFormValues>
                        label="Unit of rate"
                        {...register(`invoices.${index}.items.${itemIndex}.unitOfRate`)}
                        options={quantityCodes}
                        placeholder={invoiceValues.items[index]?.unitOfMeasurement}
                      />
                      <Input
                        label="Per Unit (Rate)"
                        type="number"
                        placeholder="1"
                        {...register(`invoices.${index}.items.${itemIndex}.numberOfUnits`)}
                      />
                      <Input
                        label="Present market value"
                        type="number"
                        {...register(`invoices.${index}.items.${itemIndex}.presentMarketValue`)}
                      />
                      <Input label="GCess" type="number" {...register(`invoices.${index}.items.${itemIndex}.cess`)} />
                      <Input
                        label="Accessories description"
                        wrapClass="lg:col-span-3"
                        {...register(`invoices.${index}.items.${itemIndex}.accessoriesDescription`)}
                      />
                      <Select<ShippingBillFormValues>
                        label="Accessory status"
                        name={`invoices.${index}.items.${itemIndex}.accessoryStatus`}
                        options={accessoryStatusOptions}
                        placeholder="Select if relevant"
                      />
                      {item.igstPaymentStatus === 'P' && (
                        <>
                          <Input
                            label="Taxable value"
                            type="number"
                            {...register(`invoices.${index}.items.${itemIndex}.taxableValue`)}
                          />
                          <Input
                            label="IGST amount"
                            type="number"
                            {...register(`invoices.${index}.items.${itemIndex}.igstAmount`)}
                          />
                        </>
                      )}

                      <Input
                        label="Origin district code"
                        {...register(`invoices.${index}.items.${itemIndex}.originDistrictCode`)}
                      />
                      <Select<ShippingBillFormValues>
                        label="Trade agreement code"
                        name={`invoices.${index}.items.${itemIndex}.tradeAgreementsCode`}
                        options={tradeAgreements}
                        placeholder="NCPTI"
                      />
                      <Input label="End use code" {...register(`invoices.${index}.items.${itemIndex}.endUseOfItem`)} />
                      <Input
                        label="Packages for item"
                        type="number"
                        {...register(`invoices.${index}.items.${itemIndex}.totalPackage`)}
                      />
                    </div>
                    <Advanced title="AR4 / excise details">
                      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                        <Input label="AR4 number" {...register(`invoices.${index}.items.${itemIndex}.ar4Number`)} />
                        <Input
                          label="AR4 date"
                          type={dateType}
                          {...register(`invoices.${index}.items.${itemIndex}.ar4Date`)}
                        />
                      </div>
                    </Advanced>
                  </Advanced>
                </div>
              )
            })}
          </div>
        </div>

        <div className="text-right text-sm font-semibold">
          Invoice total: {invoiceValues.currency}{' '}
          {invoiceTotal(invoiceValues).toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </div>
      </CardContent>
    </Card>
  )
}
