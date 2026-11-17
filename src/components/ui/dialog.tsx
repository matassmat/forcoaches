import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { AnimatePresence, motion } from "framer-motion"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"
import { dialogPanel, overlayFade } from "@/lib/motion"

/**
 * Valdomas modalas. `open` reikalingas ne tik Radix'ui, juo remiasi ir
 * AnimatePresence, kitaip turinys dingtų nespėjęs suvaidinti išėjimo.
 */
function Dialog({
  open,
  onOpenChange,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  children: React.ReactNode
}) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>{open && children}</AnimatePresence>
    </DialogPrimitive.Root>
  )
}

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  // forceMount abiejuose, kitaip Radix išimtų mazgą iš DOM iškart, o
  // AnimatePresence nebeturėtų ko animuoti išeinant.
  <DialogPrimitive.Portal forceMount>
    <DialogPrimitive.Overlay asChild forceMount>
      <motion.div
        variants={overlayFade}
        initial="hidden"
        animate="visible"
        exit="out"
        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-[2px]"
      />
    </DialogPrimitive.Overlay>

    {/* Centruoja išorinis konteineris, o ne transform.
        framer-motion rašo savo `transform`, todėl Tailwind -translate-*
        klasės ant to paties elemento būtų perrašytos ir modalas nuslystų
        į šoną bei už ekrano apačios. */}
    <DialogPrimitive.Content asChild forceMount ref={ref} {...props}>
      <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-4">
        <motion.div
          variants={dialogPanel}
          initial="hidden"
          animate="visible"
          exit="out"
          className={cn(
            "panel pointer-events-auto relative grid w-full max-w-lg gap-4 p-6",
            // Aukštas turinys slenka modalo viduje. dvh, o ne vh:
            // telefone adreso juosta vh nesumažina.
            "max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain",
            className
          )}
        >
          {children}
          <DialogPrimitive.Close
            className={cn(
              "absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg",
              "text-muted-foreground transition-colors duration-150",
              "hover:bg-muted hover:text-foreground",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
              "disabled:pointer-events-none"
            )}
          >
            <X className="h-4 w-4" />
            <span className="sr-only">Uždaryti</span>
          </DialogPrimitive.Close>
        </motion.div>
      </div>
    </DialogPrimitive.Content>
  </DialogPrimitive.Portal>
))
DialogContent.displayName = DialogPrimitive.Content.displayName

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-2 pr-8 text-left", className)} {...props} />
)
DialogHeader.displayName = "DialogHeader"

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse gap-2 sm:flex-row sm:justify-end", className)} {...props} />
)
DialogFooter.displayName = "DialogFooter"

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-medium leading-none text-foreground", className)}
    {...props}
  />
))
DialogTitle.displayName = DialogPrimitive.Title.displayName

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-sm text-muted-foreground", className)}
    {...props}
  />
))
DialogDescription.displayName = DialogPrimitive.Description.displayName

const DialogTrigger = DialogPrimitive.Trigger
const DialogClose = DialogPrimitive.Close

export {
  Dialog,
  DialogTrigger,
  DialogClose,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
}
