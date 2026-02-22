"use client";

import { useState, useRef } from "react";
import {
  IndianRupee,
  Search,
  ShieldCheck,
  Star,
  Wallet,
  Bell,
  Filter,
  MoreVertical,
} from "lucide-react";

import Button          from "@/components/ui/Button";
import Card            from "@/components/ui/Card";
import Input           from "@/components/ui/Input";
import Badge           from "@/components/ui/Badge";
import Toggle          from "@/components/ui/Toggle";
import Modal           from "@/components/ui/Modal";
import ProgressRing    from "@/components/ui/ProgressRing";
import Skeleton        from "@/components/ui/Skeleton";
import { useToast }    from "@/components/ui/ToastProvider";
import OdometerValue      from "@/components/animations/OdometerValue";
import InkSpread          from "@/components/animations/InkSpread";
import StaggerContainer   from "@/components/animations/StaggerContainer";
import PaperCrumple       from "@/components/animations/PaperCrumple";
import GoldenShimmer      from "@/components/animations/GoldenShimmer";
import AmountDisplay      from "@/components/shared/AmountDisplay";
import BottomNav          from "@/components/layout/BottomNav";
import Header            from "@/components/layout/Header";
import PageTransition    from "@/components/layout/PageTransition";

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-12">
      <h2 className="font-display text-2xl text-ink-primary mb-1">{title}</h2>
      <div className="h-px bg-border-default mb-6" />
      {children}
    </section>
  );
}

function Row({
  label,
  children,
}: {
  label?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-4">
      {label && (
        <p className="font-body text-xs text-ink-tertiary mb-2 uppercase tracking-wide">
          {label}
        </p>
      )}
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TestPage() {
  const { toast } = useToast();

  // Toggle states
  const [toggle1, setToggle1] = useState(false);
  const [toggle2, setToggle2] = useState(true);

  // Modal states
  const [modalBasic, setModalBasic]   = useState(false);
  const [modalFull,  setModalFull]    = useState(false);

  // Input states
  const [inputVal, setInputVal]       = useState("");
  const [errorVal, setErrorVal]       = useState("harshil");

  // Odometer demo state
  const [odometerVal, setOdometerVal] = useState(12345);

  // InkSpread demo state
  const [inkOpen,   setInkOpen]   = useState(false);
  const [inkOrigin, setInkOrigin] = useState({ x: 0, y: 0 });
  const fabRef = useRef<HTMLButtonElement>(null);

  const openInk = () => {
    if (fabRef.current) {
      const r = fabRef.current.getBoundingClientRect();
      setInkOrigin({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
    }
    setInkOpen(true);
  };

  // StaggerContainer demo — key bump remounts component to replay entrance
  const [staggerKey, setStaggerKey] = useState(0);

  // PaperCrumple demo list
  const [crumpleItems, setCrumpleItems] = useState([
    { id: 1, label: "Zomato dinner",  amount: "₹350",  trigger: false },
    { id: 2, label: "Uber ride",       amount: "₹180",  trigger: false },
    { id: 3, label: "Netflix",         amount: "₹649",  trigger: false },
    { id: 4, label: "Coffee — Blue Tokai", amount: "₹220", trigger: false },
  ]);

  const triggerCrumple = (id: number) =>
    setCrumpleItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, trigger: true } : item)),
    );
  const removeItem = (id: number) =>
    setCrumpleItems((prev) => prev.filter((item) => item.id !== id));
  const resetList = () =>
    setCrumpleItems([
      { id: 1, label: "Zomato dinner",       amount: "₹350",  trigger: false },
      { id: 2, label: "Uber ride",            amount: "₹180",  trigger: false },
      { id: 3, label: "Netflix",              amount: "₹649",  trigger: false },
      { id: 4, label: "Coffee — Blue Tokai", amount: "₹220",  trigger: false },
    ]);

  // GoldenShimmer demo
  const [shimmerTrigger, setShimmerTrigger] = useState(false);
  const fireShimmer = () => {
    setShimmerTrigger(false);
    // Defer to next tick so GoldenShimmer sees false → true transition
    setTimeout(() => setShimmerTrigger(true), 16);
  };

  return (
    <>
    {/* ── Sticky page header — demonstrates the real sticky+blur behaviour ── */}
    <Header
      title="Kharcha"
      rightElement={
        <button
          aria-label="Notifications"
          className="flex items-center justify-center w-10 h-10 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-black/5 transition-colors"
        >
          <Bell size={20} strokeWidth={1.8} />
        </button>
      }
    />

    <div
      className="min-h-screen"
      style={{ backgroundColor: "var(--bg-global)", padding: "var(--space-8)" }}
    >
      {/* ── Page title ────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto mb-12">
        <h1 className="font-display text-4xl text-ink-primary mb-2">
          UI Showcase
        </h1>
        <p className="font-body text-ink-secondary">
          All components rendered with the Slate &amp; Parchment design system.
        </p>
      </div>

      <div className="max-w-3xl mx-auto">

        {/* ════════════════════ BUTTON ════════════════════ */}
        <Section title="Button">
          <Row label="Variants">
            <Button variant="primary">Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="ghost">Ghost</Button>
            <Button variant="danger">Danger</Button>
          </Row>

          <Row label="Sizes">
            <Button size="sm">Small</Button>
            <Button size="md">Medium</Button>
            <Button size="lg">Large</Button>
          </Row>

          <Row label="States">
            <Button loading>Loading</Button>
            <Button loading size="sm" variant="secondary">Loading sm</Button>
            <Button disabled>Disabled</Button>
            <Button disabled variant="danger">Disabled danger</Button>
          </Row>

          <Row label="Full width">
            <Button fullWidth variant="primary">Full-width button</Button>
          </Row>
        </Section>

        {/* ════════════════════ CARD ════════════════════ */}
        <Section title="Card">
          <Row label="Static">
            <Card className="w-48" animated={false}>
              <p className="font-body text-sm text-ink-secondary">Plain card</p>
            </Card>
          </Row>

          <Row label="Animated (delay stagger)">
            <Card delay={0} className="w-44">
              <p className="font-body text-sm text-ink-secondary">Delay 0</p>
            </Card>
            <Card delay={0.1} className="w-44">
              <p className="font-body text-sm text-ink-secondary">Delay 0.1s</p>
            </Card>
            <Card delay={0.2} className="w-44">
              <p className="font-body text-sm text-ink-secondary">Delay 0.2s</p>
            </Card>
          </Row>

          <Row label="Hoverable + Clickable">
            <Card hoverable onClick={() => toast({ title: "Card clicked!" })} className="w-56">
              <p className="font-body text-sm font-medium text-ink-primary">
                Hover me, click me
              </p>
              <p className="font-body text-xs text-ink-secondary mt-1">
                Shadow elevates on hover
              </p>
            </Card>
          </Row>
        </Section>

        {/* ════════════════════ INPUT ════════════════════ */}
        <Section title="Input">
          <Row label="Basic">
            <Input
              label="Search transactions"
              placeholder="Coffee, Zomato…"
              icon={<Search size={16} />}
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              className="w-72"
            />
          </Row>

          <Row label="With right element (amount)">
            <Input
              label="Amount"
              placeholder="0"
              type="number"
              icon={<IndianRupee size={16} />}
              rightElement={
                <span className="font-mono text-sm text-ink-secondary">INR</span>
              }
              className="w-72"
            />
          </Row>

          <Row label="Error state">
            <Input
              label="Username"
              value={errorVal}
              onChange={(e) => setErrorVal(e.target.value)}
              error="This username is already taken"
              className="w-72"
            />
          </Row>

          <Row label="Disabled">
            <Input
              label="PIN"
              placeholder="••••••"
              disabled
              className="w-72"
            />
          </Row>
        </Section>

        {/* ════════════════════ BADGE ════════════════════ */}
        <Section title="Badge">
          <Row label="All variants — sm (default)">
            <Badge variant="income">Income</Badge>
            <Badge variant="expense">Expense</Badge>
            <Badge variant="vault">Vault</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="neutral">Neutral</Badge>
          </Row>

          <Row label="All variants — md">
            <Badge variant="income"  size="md">+ ₹5,000</Badge>
            <Badge variant="expense" size="md">− ₹1,200</Badge>
            <Badge variant="vault"   size="md">Emergency</Badge>
            <Badge variant="warning" size="md">Caution</Badge>
            <Badge variant="neutral" size="md">Pending</Badge>
          </Row>
        </Section>

        {/* ════════════════════ TOGGLE ════════════════════ */}
        <Section title="Toggle">
          <Row label="With label">
            <div className="w-72">
              <Toggle
                label="Dark mode"
                enabled={toggle1}
                onToggle={setToggle1}
              />
            </div>
          </Row>

          <Row label="Pre-enabled">
            <div className="w-72">
              <Toggle
                label="Auto-categorise expenses"
                enabled={toggle2}
                onToggle={setToggle2}
              />
            </div>
          </Row>

          <Row label="Disabled">
            <div className="w-72">
              <Toggle
                label="Premium feature"
                enabled={false}
                onToggle={() => {}}
                disabled
              />
            </div>
          </Row>

          <Row label="No label">
            <Toggle enabled={toggle1} onToggle={setToggle1} />
          </Row>
        </Section>

        {/* ════════════════════ MODAL ════════════════════ */}
        <Section title="Modal">
          <Row label="Triggers">
            <Button onClick={() => setModalBasic(true)}>Open basic modal</Button>
            <Button variant="secondary" onClick={() => setModalFull(true)}>
              Open fullHeight modal
            </Button>
          </Row>

          {/* Basic modal */}
          <Modal
            isOpen={modalBasic}
            onClose={() => setModalBasic(false)}
            title="Add transaction"
          >
            <div className="flex flex-col gap-4">
              <Input
                label="Description"
                placeholder="e.g. Zomato dinner"
                icon={<Search size={16} />}
              />
              <Input
                label="Amount"
                placeholder="0.00"
                type="number"
                icon={<IndianRupee size={16} />}
              />
              <div className="flex gap-3 pt-2">
                <Button
                  fullWidth
                  onClick={() => {
                    setModalBasic(false);
                    toast({ title: "Transaction added!", variant: "success" });
                  }}
                >
                  Save
                </Button>
                <Button
                  fullWidth
                  variant="ghost"
                  onClick={() => setModalBasic(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </Modal>

          {/* Full-height modal */}
          <Modal
            isOpen={modalFull}
            onClose={() => setModalFull(false)}
            title="Subscription details"
            fullHeight
          >
            <div className="flex flex-col gap-3">
              {["Netflix", "Spotify", "GitHub Pro", "Notion", "Figma"].map(
                (sub, i) => (
                  <Card key={sub} hoverable delay={i * 0.05}>
                    <div className="flex justify-between items-center">
                      <p className="font-body font-medium text-ink-primary">{sub}</p>
                      <Badge variant="expense">₹{(i + 1) * 149}</Badge>
                    </div>
                  </Card>
                ),
              )}
            </div>
          </Modal>
        </Section>

        {/* ════════════════════ TOAST ════════════════════ */}
        <Section title="Toast">
          <Row label="Trigger each variant">
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast({ title: "Saved successfully", description: "Your changes have been applied.", variant: "success" })
              }
            >
              Success
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast({ title: "Something went wrong", description: "Please try again in a moment.", variant: "error" })
              }
            >
              Error
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast({ title: "Spending fast", description: "You're at 78% of your daily limit.", variant: "warning" })
              }
            >
              Warning
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast({ title: "AI categorised", description: "Zomato → Food & Dining (95% confident)", variant: "info" })
              }
            >
              Info
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() =>
                toast({ title: "Read manually", description: "This toast won't auto-dismiss.", variant: "info", duration: 0 })
              }
            >
              Persistent
            </Button>
          </Row>
        </Section>

        {/* ════════════════════ PROGRESS RING ════════════════════ */}
        <Section title="ProgressRing">
          <Row label="Default (with percentage + label)">
            <ProgressRing progress={72} label="Budget" color="var(--color-accent)" />
            <ProgressRing progress={38} label="Vault" color="var(--color-vault)" />
            <ProgressRing progress={91} label="Danger" color="var(--color-expense)" />
            <ProgressRing progress={100} label="Full" />
            <ProgressRing progress={0}   label="Empty" />
          </Row>

          <Row label="Custom sizes">
            <ProgressRing progress={60} size={80}  strokeWidth={6} label="sm" />
            <ProgressRing progress={60} size={120} strokeWidth={8} label="md" />
            <ProgressRing progress={60} size={160} strokeWidth={10} label="lg" />
          </Row>

          <Row label="Custom centre content">
            <ProgressRing progress={55} size={120} color="var(--color-vault)">
              <div className="flex flex-col items-center">
                <ShieldCheck size={24} className="text-vault mb-1" />
                <span className="font-body text-xs text-ink-secondary">Safe</span>
              </div>
            </ProgressRing>

            <ProgressRing progress={82} size={120} color="var(--color-accent)">
              <div className="flex flex-col items-center">
                <span className="font-display text-2xl text-ink-primary">₹</span>
                <span className="font-mono text-xs text-ink-secondary">4,200</span>
              </div>
            </ProgressRing>

            <ProgressRing progress={45} size={120} color="var(--color-income)" showPercentage={false}>
              <div className="flex flex-col items-center">
                <Star size={20} className="text-sage mb-1" />
                <span className="font-body text-xs text-sage font-medium">Good</span>
              </div>
            </ProgressRing>
          </Row>

          <Row label="No animation">
            <ProgressRing progress={65} animated={false} label="Static" />
          </Row>
        </Section>

        {/* ════════════════════ SKELETON ════════════════════ */}
        <Section title="Skeleton">
          <Row label="All variants">
            <Skeleton.Circle />
            <Skeleton.Amount width="120px" />
            <Skeleton.Line width="200px" />
          </Row>

          <Row label="Line — various widths">
            <div className="flex flex-col gap-2 w-72">
              <Skeleton.Line />
              <Skeleton.Line width="75%" />
              <Skeleton.Line width="50%" />
            </div>
          </Row>

          <Row label="Card skeleton">
            <Skeleton.Card className="w-72" />
          </Row>

          <Row label="Typical transaction list skeleton">
            <div className="flex flex-col gap-3 w-full max-w-sm">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton.Circle width="40px" />
                  <div className="flex-1 flex flex-col gap-2">
                    <Skeleton.Line width="60%" />
                    <Skeleton.Line width="40%" />
                  </div>
                  <Skeleton.Amount width="64px" />
                </div>
              ))}
            </div>
          </Row>

          <Row label="Dashboard card skeleton">
            <Card animated={false} className="w-full max-w-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex flex-col gap-2 flex-1">
                  <Skeleton.Line width="40%" height="12px" />
                  <Skeleton.Amount width="55%" />
                </div>
                <Skeleton.Circle width="48px" />
              </div>
              <Skeleton.Line width="100%" height="8px" />
              <div className="flex gap-3 mt-3">
                <Skeleton.Line width="33%" height="8px" />
                <Skeleton.Line width="33%" height="8px" />
              </div>
            </Card>
          </Row>
        </Section>

        {/* ════════════════════ ODOMETER ════════════════════ */}
        <Section title="OdometerValue">
          <Row label="Sizes — static values">
            <OdometerValue value={1234}     size="sm" />
            <OdometerValue value={12345}    size="md" />
            <OdometerValue value={123456}   size="lg" />
            <OdometerValue value={1234567}  size="xl" />
          </Row>

          <Row label="Colored — positive / negative">
            <OdometerValue value={50000}  size="lg" colored />
            <OdometerValue value={-3500}  size="lg" colored />
          </Row>

          <Row label="Edge cases">
            <OdometerValue value={0}           size="md" colored />
            <OdometerValue value={999}         size="md" />
            <OdometerValue value={1000}        size="md" />
            <OdometerValue value={1234.56}     size="md" />
            <OdometerValue value={-1234.56}    size="md" colored />
          </Row>

          <Row label="Custom prefix">
            <OdometerValue value={99.99} prefix="$" size="lg" />
          </Row>

          <Row label="Interactive — digits roll on change">
            <div className="flex flex-col items-center gap-6 w-full">
              <OdometerValue value={odometerVal} size="xl" colored />
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  { label: "−10,000", delta: -10000 },
                  { label: "−1,000",  delta: -1000  },
                  { label: "−100",    delta: -100   },
                  { label: "+100",    delta:  100   },
                  { label: "+1,000",  delta:  1000  },
                  { label: "+10,000", delta:  10000 },
                ].map(({ label, delta }) => (
                  <Button
                    key={label}
                    size="sm"
                    variant={delta < 0 ? "danger" : "secondary"}
                    onClick={() => setOdometerVal((v) => v + delta)}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOdometerVal(12345)}
              >
                Reset to ₹12,345
              </Button>
            </div>
          </Row>

          <Row label="Speed variants (same value, different duration)">
            <div className="flex flex-col gap-3 w-full">
              {[
                { label: "Fast  (400 ms)", duration: 400  },
                { label: "Default (800 ms)", duration: 800 },
                { label: "Slow (1 400 ms)", duration: 1400 },
              ].map(({ label, duration }) => (
                <div key={label} className="flex items-center gap-4">
                  <span className="font-body text-xs text-ink-tertiary w-36">{label}</span>
                  <OdometerValue value={odometerVal} size="md" duration={duration} colored />
                </div>
              ))}
            </div>
          </Row>
        </Section>

        {/* ════════════════════ INK SPREAD ════════════════════ */}
        <Section title="InkSpread">
          <Row label="Tap the FAB — ink spreads from button centre">
            <p className="font-body text-sm text-ink-secondary mb-4 w-full">
              The overlay expands as a circle from the exact pixel coordinates of
              the trigger button, then content fades in at 60 % spread.
            </p>

            {/* Simulated FAB */}
            <button
              ref={fabRef}
              onClick={openInk}
              className="flex items-center justify-center w-14 h-14 rounded-full text-white shadow-lg transition-transform active:scale-95 focus:outline-none focus-visible:ring-2"
              style={{
                backgroundColor: "var(--color-accent)",
                fontSize: "1.5rem",
                fontWeight: 700,
              }}
              aria-label="Open add-expense sheet"
            >
              +
            </button>
          </Row>

          {/* InkSpread overlay */}
          <InkSpread
            isOpen={inkOpen}
            origin={inkOrigin}
            onClose={() => setInkOpen(false)}
          >
            <div
              className="flex flex-col gap-6 p-6 pt-16"
              style={{ maxWidth: "480px", margin: "0 auto" }}
            >
              <div>
                <h2 className="font-display text-3xl text-ink-primary">Add Expense</h2>
                <p className="font-body text-sm text-ink-secondary mt-1">
                  What did you spend on?
                </p>
              </div>

              <Input
                label="Description"
                placeholder="e.g. Zomato dinner"
                icon={<Search size={16} />}
              />
              <Input
                label="Amount"
                placeholder="0"
                type="number"
                icon={<IndianRupee size={16} />}
                rightElement={
                  <span className="font-mono text-sm text-ink-secondary">INR</span>
                }
              />

              <div className="flex flex-wrap gap-2">
                {["Food", "Transport", "Shopping", "Health"].map((cat) => (
                  <Badge key={cat} variant="neutral" size="md">{cat}</Badge>
                ))}
              </div>

              <Button
                fullWidth
                onClick={() => {
                  setInkOpen(false);
                  toast({ title: "Expense added!", variant: "success" });
                }}
              >
                Save Expense
              </Button>
            </div>
          </InkSpread>
        </Section>

        {/* ════════════════════ STAGGER CONTAINER ════════════════════ */}
        <Section title="StaggerContainer">
          <Row label="Children stagger in sequentially on mount">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setStaggerKey((k) => k + 1)}
              className="mb-4"
            >
              ↺ Replay entrance
            </Button>
          </Row>

          <Row label="Default timing (80 ms stagger)">
            <StaggerContainer key={staggerKey} className="flex flex-col gap-3 w-full max-w-sm">
              {[
                { label: "Monthly allowance", amount: "₹15,000", variant: "income"  as const },
                { label: "Spent so far",      amount: "₹6,420",  variant: "expense" as const },
                { label: "Vault balance",     amount: "₹8,000",  variant: "vault"   as const },
                { label: "Daily limit",       amount: "₹485",    variant: "neutral" as const },
              ].map(({ label, amount, variant }) => (
                <Card key={label} animated={false} className="flex justify-between items-center">
                  <span className="font-body text-sm text-ink-secondary">{label}</span>
                  <Badge variant={variant} size="md">{amount}</Badge>
                </Card>
              ))}
            </StaggerContainer>
          </Row>

          <Row label="Fast stagger (30 ms) vs slow (200 ms)">
            <div className="flex gap-6 w-full flex-wrap">
              <div className="flex-1 min-w-40">
                <p className="font-body text-xs text-ink-tertiary mb-2 uppercase tracking-wide">Fast · 30 ms</p>
                <StaggerContainer
                  key={`fast-${staggerKey}`}
                  staggerDelay={0.03}
                  initialDelay={0}
                  className="flex flex-col gap-2"
                >
                  {["Alpha", "Beta", "Gamma", "Delta"].map((name) => (
                    <div
                      key={name}
                      className="px-3 py-2 rounded-md font-body text-sm text-ink-primary"
                      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
                    >
                      {name}
                    </div>
                  ))}
                </StaggerContainer>
              </div>

              <div className="flex-1 min-w-40">
                <p className="font-body text-xs text-ink-tertiary mb-2 uppercase tracking-wide">Slow · 200 ms</p>
                <StaggerContainer
                  key={`slow-${staggerKey}`}
                  staggerDelay={0.2}
                  initialDelay={0.1}
                  className="flex flex-col gap-2"
                >
                  {["Alpha", "Beta", "Gamma", "Delta"].map((name) => (
                    <div
                      key={name}
                      className="px-3 py-2 rounded-md font-body text-sm text-ink-primary"
                      style={{ backgroundColor: "var(--bg-surface)", border: "1px solid var(--border-default)" }}
                    >
                      {name}
                    </div>
                  ))}
                </StaggerContainer>
              </div>
            </div>
          </Row>
        </Section>

        {/* ════════════════════ PAPER CRUMPLE ════════════════════ */}
        <Section title="PaperCrumple">
          <Row label="Click × to crumple-delete an item">
            <p className="font-body text-sm text-ink-secondary mb-4 w-full">
              Item scales down, rotates, fades out — then the space collapses
              so siblings slide up. <code className="font-mono text-xs">onRemoved</code> is
              called after the animation finishes.
            </p>

            <div className="flex flex-col gap-0 w-full max-w-sm">
              {crumpleItems.map((item) => (
                <PaperCrumple
                  key={item.id}
                  trigger={item.trigger}
                  onRemoved={() => removeItem(item.id)}
                >
                  <div
                    className="flex items-center justify-between px-4 py-3 mb-2 rounded-lg"
                    style={{
                      backgroundColor: "var(--bg-surface)",
                      border: "1px solid var(--border-default)",
                    }}
                  >
                    <div className="flex flex-col">
                      <span className="font-body text-sm font-medium text-ink-primary">
                        {item.label}
                      </span>
                      <span className="font-mono text-xs text-expense">
                        {item.amount}
                      </span>
                    </div>
                    <button
                      onClick={() => triggerCrumple(item.id)}
                      disabled={item.trigger}
                      className="flex items-center justify-center w-8 h-8 rounded-full text-ink-tertiary hover:text-expense hover:bg-red-50 transition-colors disabled:opacity-40"
                      aria-label={`Delete ${item.label}`}
                    >
                      ×
                    </button>
                  </div>
                </PaperCrumple>
              ))}

              {crumpleItems.length === 0 && (
                <p className="font-body text-sm text-ink-tertiary text-center py-4">
                  All items deleted!
                </p>
              )}
            </div>

            <Button
              size="sm"
              variant="ghost"
              onClick={resetList}
              className="mt-3"
            >
              ↺ Reset list
            </Button>
          </Row>
        </Section>

        {/* ════════════════════ GOLDEN SHIMMER ════════════════════ */}
        <Section title="GoldenShimmer">
          <Row label="Click the button — bronze shimmer sweeps over the card">
            <div className="flex flex-col gap-4 w-full max-w-sm">
              <GoldenShimmer trigger={shimmerTrigger} className="rounded-xl">
                <Card animated={false} className="flex justify-between items-center">
                  <div>
                    <p className="font-body text-xs text-ink-tertiary uppercase tracking-wide mb-1">
                      Available balance
                    </p>
                    <p className="font-display text-2xl text-ink-primary">₹8,580</p>
                  </div>
                  <Badge variant="income" size="md">+₹5,000</Badge>
                </Card>
              </GoldenShimmer>

              <div className="flex gap-3">
                <Button onClick={fireShimmer} size="sm">
                  ✦ Trigger shimmer
                </Button>
                <Button
                  onClick={() => {
                    toast({ title: "Saved!", variant: "success" });
                    fireShimmer();
                  }}
                  size="sm"
                  variant="secondary"
                >
                  Save + shimmer
                </Button>
              </div>
            </div>
          </Row>

          <Row label="Also works on any shape">
            <GoldenShimmer trigger={shimmerTrigger} className="rounded-full">
              <div
                className="flex items-center justify-center w-24 h-24 rounded-full"
                style={{ backgroundColor: "var(--bg-surface)", border: "2px solid var(--border-default)" }}
              >
                <span className="font-display text-lg text-ink-primary">₹500</span>
              </div>
            </GoldenShimmer>
          </Row>
        </Section>

        {/* ════════════════════ AMOUNT DISPLAY ════════════════════ */}
        <Section title="AmountDisplay">
          <Row label="Types — income / expense / neutral">
            <AmountDisplay amount={15000} type="income"  size="lg" />
            <AmountDisplay amount={3500}  type="expense" size="lg" />
            <AmountDisplay amount={8000}  type="neutral" size="lg" />
          </Row>

          <Row label="Sizes">
            <AmountDisplay amount={12345} type="expense" size="sm" />
            <AmountDisplay amount={12345} type="expense" size="md" />
            <AmountDisplay amount={12345} type="expense" size="lg" />
          </Row>

          <Row label="Without sign (showSign=false)">
            <AmountDisplay amount={5000}  type="income"  showSign={false} size="md" />
            <AmountDisplay amount={1200}  type="expense" showSign={false} size="md" />
            <AmountDisplay amount={8000}  type="neutral" showSign={false} size="md" />
          </Row>

          <Row label="USD currency">
            <AmountDisplay amount={99.99}   currency="USD" type="expense" size="md" />
            <AmountDisplay amount={1234.56} currency="USD" type="income"  size="md" />
          </Row>

          <Row label="Edge cases">
            <AmountDisplay amount={0}          type="neutral" size="md" />
            <AmountDisplay amount={999}        type="expense" size="md" />
            <AmountDisplay amount={1000}       type="income"  size="md" />
            <AmountDisplay amount={1234.5}     type="expense" size="md" />
            <AmountDisplay amount={1000000}    type="income"  size="md" />
          </Row>

          <Row label="Animated (OdometerValue) — syncs with Odometer demo value">
            <div className="flex flex-col gap-4 w-full">
              <div className="flex gap-6 items-end flex-wrap">
                <AmountDisplay amount={odometerVal} type="income"  size="lg" animated />
                <AmountDisplay amount={odometerVal} type="expense" size="lg" animated />
              </div>
              <p className="font-body text-xs text-ink-tertiary">
                Use the +/− buttons in the OdometerValue section above to see these roll.
              </p>
            </div>
          </Row>
        </Section>

        {/* ════════════════════ HEADER ════════════════════ */}
        <Section title="Header">
          <Row label="Title only (home / top-level pages)">
            {/* Static preview — no sticky, overflow:hidden so it reads as a card */}
            <div className="w-full overflow-hidden rounded-xl border border-border-default">
              <div style={{ position: "relative" }}>
                <Header title="Kharcha" />
              </div>
            </div>
          </Row>

          <Row label="With right element — notification bell">
            <div className="w-full overflow-hidden rounded-xl border border-border-default">
              <div style={{ position: "relative" }}>
                <Header
                  title="Dashboard"
                  rightElement={
                    <button
                      aria-label="Notifications"
                      className="flex items-center justify-center w-10 h-10 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-black/5 transition-colors"
                    >
                      <Bell size={20} strokeWidth={1.8} />
                    </button>
                  }
                />
              </div>
            </div>
          </Row>

          <Row label="With back button (detail pages)">
            <div className="w-full overflow-hidden rounded-xl border border-border-default">
              <div style={{ position: "relative" }}>
                <Header
                  title="Transaction"
                  showBack
                  onBack={() => toast({ title: "Back pressed", variant: "info" })}
                />
              </div>
            </div>
          </Row>

          <Row label="Back + right element + longer title">
            <div className="w-full overflow-hidden rounded-xl border border-border-default">
              <div style={{ position: "relative" }}>
                <Header
                  title="All Transactions"
                  showBack
                  onBack={() => toast({ title: "Back pressed", variant: "info" })}
                  rightElement={
                    <div className="flex items-center">
                      <button
                        aria-label="Filter"
                        className="flex items-center justify-center w-10 h-10 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-black/5 transition-colors"
                      >
                        <Filter size={18} strokeWidth={1.8} />
                      </button>
                      <button
                        aria-label="More options"
                        className="flex items-center justify-center w-10 h-10 rounded-full text-ink-secondary hover:text-ink-primary hover:bg-black/5 transition-colors"
                      >
                        <MoreVertical size={18} strokeWidth={1.8} />
                      </button>
                    </div>
                  }
                />
              </div>
            </div>
          </Row>

          <Row label="Sticky on this page (scroll up to see it in action)">
            <p className="font-body text-sm text-ink-secondary">
              The actual page header above is sticky — scroll to the top to see
              the frosted-glass blur over the content below.
            </p>
          </Row>
        </Section>

        {/* ════════════════════ BOTTOM NAV ════════════════════ */}
        <Section title="BottomNav">
          <Row label="Mounted below — scroll to page bottom to see it">
            <p className="font-body text-sm text-ink-secondary w-full">
              Fixed to the viewport bottom. Active tab indicator (4 px dot) slides
              with a spring animation between tabs. Centre FAB oscillates ±2 px.
              The active tab on this preview page is <strong>/test</strong> (no match
              = all tabs inactive, which is fine for the showcase).
            </p>
            <p className="font-body text-sm text-ink-secondary w-full mt-2">
              The &quot;+&quot; button logs to console. In production it opens the InkSpread
              Add Expense overlay.
            </p>
          </Row>
        </Section>

        {/* ════════════════════ PAGE TRANSITION ════════════════════ */}
        <Section title="PageTransition">
          <Row label="Architecture — template.tsx vs layout.tsx">
            <div
              className="w-full rounded-xl p-4 font-mono text-xs leading-relaxed"
              style={{
                backgroundColor: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
                color: "var(--text-primary)",
              }}
            >
              <p style={{ color: "var(--color-accent)", marginBottom: "0.5rem" }}>
                // app/layout.tsx — persists across navigations (never unmounts)
              </p>
              <p>{"<ToastProvider>"}</p>
              <p>{"  <Providers>"}</p>
              <p style={{ color: "var(--text-secondary)" }}>{"    {children}  ← no AnimatePresence here!"}</p>
              <p>{"  </Providers>"}</p>
              <p>{"</ToastProvider>"}</p>
              <br />
              <p style={{ color: "var(--color-accent)", marginBottom: "0.5rem" }}>
                // app/template.tsx — re-mounts on every navigation ✓
              </p>
              <p>{"<AnimatePresence mode=\"wait\" initial={false}>"}</p>
              <p>{"  <PageTransition key={pathname}>"}</p>
              <p style={{ color: "var(--text-secondary)" }}>{"    {children}  ← each page gets enter/exit"}</p>
              <p>{"  </PageTransition>"}</p>
              <p>{"</AnimatePresence>"}</p>
            </div>
          </Row>

          <Row label="Animation variants (page-turn metaphor)">
            <div className="flex flex-col gap-3 w-full">
              {[
                { label: "initial  (enter from right)", opacity: 0,   x: 30,   rotateY: "2°",  color: "var(--color-expense)" },
                { label: "animate  (resting state)",    opacity: 1,   x: 0,    rotateY: "0°",  color: "var(--color-income)"  },
                { label: "exit     (leave to left)",    opacity: 0,   x: -30,  rotateY: "-2°", color: "var(--color-accent)"  },
              ].map(({ label, opacity, x, rotateY, color }) => (
                <div
                  key={label}
                  className="flex items-center gap-3 rounded-lg px-4 py-3"
                  style={{
                    backgroundColor: "var(--bg-surface)",
                    border: `1px solid ${color}`,
                    opacity: opacity === 0 ? 0.55 : 1,
                  }}
                >
                  <span
                    className="font-mono text-xs w-36 shrink-0"
                    style={{ color }}
                  >
                    {label}
                  </span>
                  <span className="font-mono text-xs" style={{ color: "var(--text-secondary)" }}>
                    opacity: {opacity} &nbsp;·&nbsp; x: {x}px &nbsp;·&nbsp; rotateY: {rotateY}
                  </span>
                </div>
              ))}
            </div>
            <p className="font-body text-xs text-ink-tertiary mt-3 w-full">
              Spring transition: stiffness 260 · damping 30. Exit uses the same spring
              (fast enough that the leaving page doesn&apos;t linger on mobile).
            </p>
          </Row>

          <Row label="Live static preview — PageTransition wrapping a card">
            <p className="font-body text-sm text-ink-secondary mb-4 w-full">
              The wrapper below uses <code className="font-mono text-xs">animate=&quot;animate&quot;</code> only
              (no enter/exit) to show the resting layout: min-height fills the viewport
              minus BottomNav, overflow-x is hidden, perspective is 1 200 px.
            </p>
            <div
              className="w-full rounded-xl overflow-hidden"
              style={{ border: "1px solid var(--border-default)", maxHeight: "260px" }}
            >
              <PageTransition>
                <div className="p-6 flex flex-col gap-4">
                  <h3 className="font-display text-xl" style={{ color: "var(--text-primary)" }}>
                    Sample Page
                  </h3>
                  <p className="font-body text-sm" style={{ color: "var(--text-secondary)" }}>
                    This content is wrapped by PageTransition. In production, navigating
                    between routes triggers the slide + rotateY enter/exit animations via
                    template.tsx.
                  </p>
                  <Badge variant="income" size="md">Resting state</Badge>
                </div>
              </PageTransition>
            </div>
          </Row>

          <Row label="Navigate to verify (if routes exist)">
            <p className="font-body text-sm text-ink-secondary w-full">
              Once app pages are wired up, navigating between them will play the
              page-turn animation automatically — no extra code needed per page.
              The <code className="font-mono text-xs">template.tsx</code> wraps every
              route segment under <code className="font-mono text-xs">app/</code>.
            </p>
          </Row>
        </Section>

        {/* ── Footer spacer so content isn't hidden behind BottomNav ─────── */}
        <div className="mt-8 pb-24 pt-8 border-t border-border-default">
          <div className="flex items-center gap-2 text-ink-tertiary">
            <Wallet size={16} />
            <span className="font-body text-sm">
              Kharcha UI — Phase 1 component showcase
            </span>
          </div>
        </div>
      </div>
    </div>

    {/* ── BottomNav: fixed to viewport, always visible ─────────────────── */}
    <BottomNav onAddPress={openInk} />
    </>
  );
}
