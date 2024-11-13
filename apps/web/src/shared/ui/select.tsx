"use client"

import * as React from "react"
import { Select as SelectPrimitive } from "@base-ui/react/select"

import { cn } from "@shared/utils"
import { ChevronDownIcon, CheckIcon, ChevronUpIcon } from "lucide-react"

const useIsoLayoutEffect =
  typeof document !== "undefined" ? React.useLayoutEffect : React.useEffect

// Context interne : chaque SelectItem enregistre son label ici à la volée
// pour que SelectValue puisse afficher le bon label (au lieu de la value
// brute, ex. "all" / "oui"). base-ui ne le fait pas tout seul sauf si on
// lui passe une prop `items`, ce qu'on évite pour rester sur le pattern
// JSX déclaratif `<SelectItem value="x">Label</SelectItem>`.
type LabelsMap = ReadonlyMap<unknown, React.ReactNode>
interface LabelsContextValue {
  labels: LabelsMap
  register: (value: unknown, label: React.ReactNode) => void
  unregister: (value: unknown) => void
}
const SelectLabelsContext = React.createContext<LabelsContextValue | null>(
  null
)

function Select<Value, Multiple extends boolean | undefined = false>(
  props: SelectPrimitive.Root.Props<Value, Multiple>
) {
  // Ref pour le Map stable (toujours la même instance entre renders), state
  // pour signaler les changements de contenu. Garder `ctx` stable est crucial :
  // sinon le useLayoutEffect des SelectItem se redéclenche → register →
  // setVersion → nouveau ctx → boucle infinie.
  const labelsRef = React.useRef<Map<unknown, React.ReactNode>>(new Map())
  const [, forceUpdate] = React.useReducer((n: number) => n + 1, 0)
  const ctx = React.useMemo<LabelsContextValue>(
    () => ({
      labels: labelsRef.current,
      register: (value, label) => {
        if (labelsRef.current.get(value) === label) return
        labelsRef.current.set(value, label)
        forceUpdate()
      },
      unregister: (value) => {
        if (!labelsRef.current.has(value)) return
        labelsRef.current.delete(value)
        forceUpdate()
      },
    }),
    []
  )
  return (
    <SelectLabelsContext.Provider value={ctx}>
      <SelectPrimitive.Root {...props} />
    </SelectLabelsContext.Provider>
  )
}

function SelectGroup({ className, ...props }: SelectPrimitive.Group.Props) {
  return (
    <SelectPrimitive.Group
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  )
}

function SelectValue({
  className,
  placeholder,
  children,
  ...props
}: SelectPrimitive.Value.Props) {
  const ctx = React.useContext(SelectLabelsContext)
  const renderFromLabels = React.useCallback(
    (value: unknown) => {
      const label = ctx?.labels.get(value)
      if (label != null) return label as React.ReactNode
      return placeholder ?? null
    },
    [ctx, placeholder]
  )
  return (
    <SelectPrimitive.Value
      data-slot="select-value"
      placeholder={placeholder}
      className={cn("flex flex-1 text-left", className)}
      {...props}
    >
      {children ?? renderFromLabels}
    </SelectPrimitive.Value>
  )
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ...props
}: SelectPrimitive.Trigger.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SelectPrimitive.Trigger
      data-slot="select-trigger"
      data-size={size}
      className={cn(
        "group/select-trigger flex w-fit items-center justify-between gap-2 rounded-lg border border-input bg-card py-2 pr-2 pl-3 text-sm whitespace-nowrap shadow-xs shadow-sable-900/[0.04] outline-none select-none transition-[background-color,border-color,box-shadow,color] duration-200 ease-out hover:border-sable-300 hover:bg-sable-50/70 hover:shadow-sm focus-visible:border-coral-400 focus-visible:ring-3 focus-visible:ring-coral-200/50 data-[popup-open]:border-coral-300 data-[popup-open]:bg-card data-[popup-open]:shadow-sm data-[popup-open]:ring-3 data-[popup-open]:ring-coral-200/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-8 data-[size=sm]:h-7 data-[size=sm]:rounded-[min(var(--radius-md),10px)] *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      {children}
      <SelectPrimitive.Icon
        render={
          <ChevronDownIcon className="pointer-events-none size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-out group-data-[popup-open]/select-trigger:rotate-180 group-data-[popup-open]/select-trigger:text-coral-500" />
        }
      />
    </SelectPrimitive.Trigger>
  )
}

function SelectContent({
  className,
  children,
  side = "bottom",
  sideOffset = 6,
  align = "start",
  alignOffset = 0,
  alignItemWithTrigger = false,
  ...props
}: SelectPrimitive.Popup.Props &
  Pick<
    SelectPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset" | "alignItemWithTrigger"
  >) {
  return (
    <SelectPrimitive.Portal>
      <SelectPrimitive.Positioner
        side={side}
        sideOffset={sideOffset}
        align={align}
        alignOffset={alignOffset}
        alignItemWithTrigger={alignItemWithTrigger}
        className="isolate z-50"
      >
        <SelectPrimitive.Popup
          data-slot="select-content"
          data-align-trigger={alignItemWithTrigger}
          className={cn(
            "relative isolate z-50 max-h-(--available-height) min-w-(--anchor-width) max-w-[min(20rem,calc(100vw-1rem))] origin-(--transform-origin) overflow-x-hidden overflow-y-auto rounded-xl border border-sable-200/80 bg-popover p-1 text-popover-foreground shadow-lg shadow-sable-900/[0.08] ring-1 ring-foreground/[0.04] duration-150 ease-out data-[align-trigger=true]:animate-none data-[side=bottom]:slide-in-from-top-1 data-[side=inline-end]:slide-in-from-left-1 data-[side=inline-start]:slide-in-from-right-1 data-[side=left]:slide-in-from-right-1 data-[side=right]:slide-in-from-left-1 data-[side=top]:slide-in-from-bottom-1 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 dark:border-border dark:shadow-black/40",
            className
          )}
          {...props}
        >
          <SelectScrollUpButton />
          <SelectPrimitive.List>{children}</SelectPrimitive.List>
          <SelectScrollDownButton />
        </SelectPrimitive.Popup>
      </SelectPrimitive.Positioner>
    </SelectPrimitive.Portal>
  )
}

function SelectLabel({
  className,
  ...props
}: SelectPrimitive.GroupLabel.Props) {
  return (
    <SelectPrimitive.GroupLabel
      data-slot="select-label"
      className={cn("px-1.5 py-1 text-xs text-muted-foreground", className)}
      {...props}
    />
  )
}

function SelectItem({
  className,
  children,
  value,
  label,
  ...props
}: SelectPrimitive.Item.Props) {
  const ctx = React.useContext(SelectLabelsContext)
  useIsoLayoutEffect(() => {
    if (!ctx || value === undefined) return
    ctx.register(value, (children ?? label) as React.ReactNode)
    return () => ctx.unregister(value)
  }, [ctx, value, children, label])
  return (
    <SelectPrimitive.Item
      data-slot="select-item"
      value={value}
      label={label}
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-md py-1.5 pr-8 pl-2 text-sm outline-hidden transition-colors duration-100 select-none focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-selected:font-medium data-selected:text-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className
      )}
      {...props}
    >
      <SelectPrimitive.ItemText className="flex flex-1 shrink-0 gap-2 whitespace-nowrap">
        {children}
      </SelectPrimitive.ItemText>
      <SelectPrimitive.ItemIndicator
        render={
          <span className="pointer-events-none absolute right-2 flex size-4 items-center justify-center text-coral-500" />
        }
      >
        <CheckIcon className="pointer-events-none" />
      </SelectPrimitive.ItemIndicator>
    </SelectPrimitive.Item>
  )
}

function SelectSeparator({
  className,
  ...props
}: SelectPrimitive.Separator.Props) {
  return (
    <SelectPrimitive.Separator
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  )
}

function SelectScrollUpButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollUpArrow>) {
  return (
    <SelectPrimitive.ScrollUpArrow
      data-slot="select-scroll-up-button"
      className={cn(
        "top-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronUpIcon
      />
    </SelectPrimitive.ScrollUpArrow>
  )
}

function SelectScrollDownButton({
  className,
  ...props
}: React.ComponentProps<typeof SelectPrimitive.ScrollDownArrow>) {
  return (
    <SelectPrimitive.ScrollDownArrow
      data-slot="select-scroll-down-button"
      className={cn(
        "bottom-0 z-10 flex w-full cursor-default items-center justify-center bg-popover py-1 [&_svg:not([class*='size-'])]:size-4",
        className
      )}
      {...props}
    >
      <ChevronDownIcon
      />
    </SelectPrimitive.ScrollDownArrow>
  )
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
}
