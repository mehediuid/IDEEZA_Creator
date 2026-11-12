"use client";

// AU-40 · Sign-in & security (Settings › Account), in the web's words: How
// you sign in (Email, Password, Apple, Google, Facebook), Protection (2-step
// sign-in), Your devices (also the sign-in history,
// D-17) with Sign out of all other devices, and Delete account. AU-40b
// loading, AU-40c couldn't load (the record can't be read), AU-40d offline
// (what was read stays, changes wait). Sheets: AU-43 disconnect (neutral),
// AU-43b can't disconnect the last way in, AU-44d turn 2-step off (password
// to confirm), AU-45 a device, AU-45b sign out of all other devices; the
// Demo stand-in for a provider's own sheet connects one. AU-42b / AU-33b:
// the toasts the sub-screens come back with.

import * as React from "react";
import { ComputerIcon, SmartPhone01Icon, Tablet01Icon, ArrowRight01Icon } from "@hugeicons/core-free-icons";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Field, PasswordInput, errorProps, useFieldIds } from "@/components/auth/auth-parts";
import { Icon } from "@/components/dashboard/icon";
import { Badge } from "@/components/ideeza/badge";
import { Button } from "@/components/ideeza/button";
import { TextInput } from "@/components/ideeza/text-input";
import { Toggle } from "@/components/ideeza/toggle";
import { countryOfZone, isCurrentPassword, SESSION_KEY, useAuth } from "@/lib/account/auth";
import { countryNameOf } from "@/lib/account/countries";
import {
  PROVIDERS,
  PROVIDER_WORDS,
  isLastWayIn,
  linkProvider,
  phoneAccountOf,
  unlinkProvider,
  usePhoneAccounts,
  type Provider,
} from "@/lib/account/phone";
import {
  SECURITY_KEY,
  backupLeft,
  checkTwoStepCode,
  cityOfZone,
  DEVICE_KEY,
  deviceOf,
  thisDeviceId,
  twoStepOff,
  updateSecurity,
  useSecurity,
  withoutDevice,
  withoutOtherDevices,
  type DeviceRecord,
} from "@/lib/account/security";
import { notifyStores, parseStored, useStoredKey } from "@/lib/key-store";
import { useDates } from "@/lib/settings/use-dates";
import { cn } from "@/lib/utils";
import { ConfirmSheet } from "../kit/confirm-sheet";
import { T } from "../type";
import { Sheet } from "../kit/sheet";
import { ErrorState } from "../kit/state";
import { useOnline } from "../kit/states";
import { useToast } from "../kit/toast";
import { ARRIVED, PageBones, SettingsScreen } from "./kit";
import { SignOutSheet } from "./sign-out";

/** What this phone is, read from the browser. */
export function useThisDevice(): { id: string; name: string; os: string; app: string; where: string } {
  const [d] = React.useState(() => {
    const standalone = window.matchMedia?.("(display-mode: standalone)").matches ?? false;
    const ua = deviceOf(navigator.userAgent, standalone);
    let where = "";
    try {
      const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const country = countryOfZone(zone);
      where = [cityOfZone(zone), country ? countryNameOf(country) : ""].filter(Boolean).join(", ");
    } catch {
      where = "";
    }
    return { ...ua, where };
  });
  const stored = parseStored(useStoredKey(DEVICE_KEY).raw).value as { id?: unknown } | null;
  const id = typeof stored?.id === "string" ? stored.id : "";
  // Made once per browser, after render: writing the key re-renders its readers.
  React.useEffect(() => {
    if (!id) thisDeviceId();
  }, [id]);
  return { ...d, id };
}

/** When the signed-in session started. */
export function useSessionAt(): number {
  const s = useStoredKey(SESSION_KEY);
  const v = parseStored(s.raw).value as { at?: unknown } | null;
  return typeof v?.at === "number" ? v.at : 0;
}

function Heading({ children }: { children: React.ReactNode }) {
  return <h2 className={T.section}>{children}</h2>;
}

/** "Mobile / Info row": the label, its value on the right, a chevron; 44 tall. */
function InfoRow({ label, value, onClick, href, disabled }: { label: string; value: string; onClick?: () => void; href?: string; disabled?: boolean }) {
  const cls = cn(
    "flex min-h-[44px] w-full items-center gap-4 rounded-md p-6 text-left outline-none transition-colors duration-fast",
    disabled ? "cursor-not-allowed" : "hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus",
  );
  const body = (
    <>
      <span className={cn(T.body, "flex-1", disabled ? "text-text-disabled" : "text-text-secondary")}>{label}</span>
      <span className={cn(T.body, "min-w-0 truncate", disabled ? "text-text-disabled" : "text-text-primary")}>{value}</span>
      <span className={disabled ? "text-[color:var(--color-icon-disabled)]" : "text-[color:var(--color-icon-default)]"}>
        <Icon icon={ArrowRight01Icon} size={16} />
      </span>
    </>
  );
  if (href && !disabled)
    return (
      <Link href={href} className={cls}>
        {body}
      </Link>
    );
  return (
    <button type="button" className={cls} onClick={onClick} disabled={disabled}>
      {body}
    </button>
  );
}

/** A10 Toggle with its label and supporting text, the whole line one target. */
function ToggleLine({
  id,
  label,
  help,
  checked,
  onChange,
  disabled,
}: {
  id: string;
  label: string;
  help: string;
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <div id={id} className={"flex items-start gap-8 rounded-md py-2" + ARRIVED}>
      <Toggle checked={checked} onChange={onChange} disabled={disabled} aria-label={label} className="mt-1" />
      <button type="button" disabled={disabled} onClick={onChange} className="flex flex-1 flex-col gap-2 text-left outline-none disabled:cursor-not-allowed">
        <span className={cn(T.bodyLg, disabled ? "text-text-disabled" : "text-[color:var(--color-input-label)]")}>{label}</span>
        <span className={cn(T.meta, "text-[color:var(--color-input-helper)]")}>{help}</span>
      </button>
    </div>
  );
}

const PHONE_OS = new Set(["iOS", "Android"]);

function deviceIcon(os: string) {
  return PHONE_OS.has(os) ? SmartPhone01Icon : os === "iPadOS" ? Tablet01Icon : ComputerIcon;
}

/** "Mobile / Product row": a 56 tile with the device, its name and where / when. */
function DeviceRow({ name, line, os, demo, onClick }: { name: string; line: string; os: string; demo?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[80px] w-full items-center gap-6 rounded-md p-6 text-left outline-none transition-colors duration-fast hover:bg-bg-subtle focus-visible:ring-2 focus-visible:ring-border-focus"
    >
      <span aria-hidden className="inline-flex size-[56px] shrink-0 items-center justify-center rounded-md bg-bg-subtle text-[color:var(--color-icon-default)]">
        <Icon icon={deviceIcon(os)} size={24} />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-1">
        <span className="flex items-center gap-4">
          <span className={cn(T.name, "truncate")}>{name}</span>
          {demo && (
            <Badge tone="warning" className="shrink-0">
              Demo
            </Badge>
          )}
        </span>
        <span className={cn(T.meta, "truncate")}>{line}</span>
      </span>
      <span className="text-[color:var(--color-icon-default)]">
        <Icon icon={ArrowRight01Icon} size={16} />
      </span>
    </button>
  );
}

type Open =
  | null
  | { kind: "connect"; provider: Provider }
  | { kind: "disconnect"; provider: Provider }
  | { kind: "last-way"; provider: Provider }
  | { kind: "two-step-off" }
  | { kind: "device"; device: DeviceRecord | "this" }
  | { kind: "others" }
  | { kind: "sign-out" };

export function SecuritySettings() {
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const dates = useDates();
  const { hydrated, account } = useAuth();
  const email = account?.email ?? "";
  const phoneAccount = phoneAccountOf(usePhoneAccounts(), email);
  const { hydrated: secRead, security } = useSecurity(email);
  const unreadable = parseStored(useStoredKey(SECURITY_KEY).raw).unreadable;
  const sessionAt = useSessionAt();
  const me = useThisDevice();
  const [open, setOpen] = React.useState<Open>(null);
  const close = () => setOpen(null);

  const failed = () => toast({ title: "Couldn’t save. Nothing changed.", lead: "error" });
  const others = security.devices.filter((d) => d.id !== me.id);

  if (!hydrated || !secRead) {
    return (
      <SettingsScreen title="Sign-in & security" back="/m/settings/account">
        <PageBones />
      </SettingsScreen>
    );
  }

  if (unreadable) {
    return (
      <SettingsScreen title="Sign-in & security" back="/m/settings/account" offlineNote={false}>
        <ErrorState
          title="Couldn’t load Sign-in & security"
          body="Check your connection, or try again in a moment."
          action={{ label: "Try again", onClick: notifyStores }}
        />
      </SettingsScreen>
    );
  }

  const passwordValue = phoneAccount.passwordless
    ? "Add a password"
    : security.passwordChangedAt
      ? `Changed ${dates.date(security.passwordChangedAt, { style: "day" })}`
      : "Change";
  const twoStepOn = !!security.twoStep;

  return (
    <SettingsScreen title="Sign-in & security" back="/m/settings/account" offlineNote={false}>
      <section className="flex flex-col gap-4" id="how-you-sign-in">
        <Heading>How you sign in</Heading>
        <div className="flex flex-col">
          <InfoRow label="Email" value={email} href="/m/settings/security/email" disabled={!online} />
          <InfoRow label="Password" value={passwordValue} href="/m/settings/security/password" disabled={!online} />
          {PROVIDERS.map((p) => {
            const linked = phoneAccount.providers.includes(p);
            return (
              <InfoRow
                key={p}
                label={PROVIDER_WORDS[p]}
                value={linked ? "Connected" : "Connect"}
                disabled={!online}
                onClick={() =>
                  setOpen(
                    !linked
                      ? { kind: "connect", provider: p }
                      : isLastWayIn(phoneAccount, p)
                        ? { kind: "last-way", provider: p }
                        : { kind: "disconnect", provider: p },
                  )
                }
              />
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-4" id="protection">
        <Heading>Protection</Heading>
        <ToggleLine
          id="two-step"
          label="2-step sign-in"
          help={
            twoStepOn
              ? `A code from an authenticator app when you sign in on a new device. ${backupLeft(security)} of 10 backup codes left.`
              : "A code from an authenticator app when you sign in on a new device."
          }
          checked={twoStepOn}
          disabled={!online}
          onChange={() => (twoStepOn ? setOpen({ kind: "two-step-off" }) : router.push("/m/settings/security/two-step"))}
        />
      </section>

      <section className={"flex flex-col gap-4 rounded-md" + ARRIVED} id="devices">
        <Heading>Your devices</Heading>
        <div className="flex flex-col">
          <DeviceRow
            name={`${me.name} · ${PHONE_OS.has(me.os) ? "This phone" : "This device"}`}
            line={[me.where, "Active now"].filter(Boolean).join(" · ")}
            os={me.os}
            onClick={() => setOpen({ kind: "device", device: "this" })}
          />
          {others.map((d) => (
            <DeviceRow
              key={d.id}
              name={d.name}
              line={[d.where.split(",")[0], `Signed in ${dates.date(d.signedInAt, { style: "day" })}`].filter(Boolean).join(" · ")}
              os={d.os}
              demo={d.demo}
              onClick={() => setOpen({ kind: "device", device: d })}
            />
          ))}
        </div>
        <Button hierarchy="secondary" size="xl" className="w-full" disabled={!online || !others.length} onClick={() => setOpen({ kind: "others" })}>
          Sign out of all other devices
        </Button>
        {!others.length && <p className={cn(T.meta, "-mt-2 text-text-tertiary")}>Only this phone is signed in.</p>}
      </section>

      <Link
        id="delete"
        href="/m/settings/delete"
        aria-disabled={!online || undefined}
        onClick={(e) => !online && e.preventDefault()}
        className="flex flex-col gap-1 rounded-md py-4 outline-none focus-visible:ring-2 focus-visible:ring-border-focus"
      >
        <span className={cn(T.body, online ? "text-text-error" : "text-text-disabled")}>Delete account</span>
        <span className={cn(T.meta, "text-text-tertiary")}>You have 30 days to change your mind.</span>
      </Link>

      <ConnectSheet
        provider={open?.kind === "connect" ? open.provider : null}
        email={email}
        onClose={close}
        onConnect={(p) => {
          close();
          if (!linkProvider(email, p).ok) return failed();
          toast({ title: `${PROVIDER_WORDS[p]} connected` });
        }}
      />
      {open?.kind === "disconnect" && (
        <ConfirmSheet
          open
          onClose={close}
          title={`Disconnect ${PROVIDER_WORDS[open.provider]}?`}
          body={
            phoneAccount.passwordless
              ? `You’ll still sign in with ${phoneAccount.providers.filter((p) => p !== open.provider).map((p) => PROVIDER_WORDS[p]).join(" or ")}. You can connect ${PROVIDER_WORDS[open.provider]} again any time.`
              : `You’ll still sign in with your email and password. You can connect ${PROVIDER_WORDS[open.provider]} again any time.`
          }
          verb="Disconnect"
          onConfirm={() => {
            if (!unlinkProvider(email, open.provider).ok) return failed();
            toast({ title: `${PROVIDER_WORDS[open.provider]} disconnected` });
          }}
        />
      )}
      <Sheet
        open={open?.kind === "last-way"}
        onClose={close}
        title={open?.kind === "last-way" ? `You can’t disconnect ${PROVIDER_WORDS[open.provider]} yet` : ""}
        actions={
          <>
            <Button size="xl" className="w-full" onClick={() => router.push("/m/settings/security/password")}>
              Add a password
            </Button>
            <Button hierarchy="secondary" size="xl" className="w-full" onClick={close}>
              Cancel
            </Button>
          </>
        }
      >
        <p className={T.body}>It’s your only way to sign in. Add a password first so you can still get in.</p>
      </Sheet>
      <TwoStepOffSheet
        open={open?.kind === "two-step-off"}
        onClose={close}
        email={email}
        passwordless={phoneAccount.passwordless}
        onDone={() => {
          close();
          if (!updateSecurity(email, twoStepOff).ok) return failed();
          toast({ title: "2-step sign-in is off" });
        }}
        sessionAt={sessionAt}
      />
      <DeviceSheet
        open={open?.kind === "device"}
        device={open?.kind === "device" ? open.device : null}
        me={me}
        onClose={close}
        onSignOut={(d) => {
          if (d === "this") return setOpen({ kind: "sign-out" });
          close();
          if (!updateSecurity(email, (s) => withoutDevice(s, d.id)).ok) return failed();
          toast({ title: `Signed out of ${d.name}` });
        }}
      />
      <ConfirmSheet
        open={open?.kind === "others"}
        onClose={close}
        title="Sign out of all other devices?"
        body={`${others.map((d) => d.name).join(", ")} will need to sign in again. This phone stays signed in.`}
        verb="Sign out"
        onConfirm={() => {
          if (!updateSecurity(email, (s) => withoutOtherDevices(s, me.id)).ok) return failed();
          toast({ title: "Signed out of other devices" });
        }}
      />
      <SignOutSheet open={open?.kind === "sign-out"} onClose={close} />
    </SettingsScreen>
  );
}

/** The Demo stand-in for a provider's own sheet: it connects the provider account with this email. */
function ConnectSheet({
  provider,
  email,
  onClose,
  onConnect,
}: {
  provider: Provider | null;
  email: string;
  onClose: () => void;
  onConnect: (p: Provider) => void;
}) {
  if (!provider) return null;
  const words = PROVIDER_WORDS[provider];
  return (
    <Sheet
      open
      onClose={onClose}
      title={`Connect ${words}`}
      description={`On a phone, ${words} shows its own sheet here. This demo connects the ${words} account with your email.`}
      actions={
        <>
          <Button size="xl" className="w-full" onClick={() => onConnect(provider)}>
            Continue
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      <Badge tone="warning" className="self-start">
        Demo
      </Badge>
      <p className={T.body}>
        Then you can sign in with {words} as <span className="text-text-primary">{email}</span>.
      </p>
    </Sheet>
  );
}

/** AU-44d · Turn off 2-step: the password confirms it (an account with none types an app code). */
function TwoStepOffSheet({
  open,
  onClose,
  email,
  passwordless,
  sessionAt,
  onDone,
}: {
  open: boolean;
  onClose: () => void;
  email: string;
  passwordless: boolean;
  sessionAt: number;
  onDone: () => void;
}) {
  const ids = useFieldIds(["secret"] as const);
  const { security } = useSecurity(email);
  const [value, setValue] = React.useState("");
  const [wrong, setWrong] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [wasOpen, setWasOpen] = React.useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setValue("");
    setWrong(false);
  }
  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!value || busy) return;
    setBusy(true);
    const ok = passwordless
      ? (await checkTwoStepCode(security, value.replace(/\D/g, ""), Date.now(), sessionAt, null)).result === "ok"
      : await isCurrentPassword(email, value);
    setBusy(false);
    if (!ok) return setWrong(true);
    onDone();
  };
  const error = wrong ? (passwordless ? "That code didn’t work. Check the app and try again." : "That’s not your password.") : "";
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Turn off 2-step sign-in?"
      description={
        passwordless
          ? "Your account will be easier to get into. Enter a code from your authenticator app to turn it off."
          : "Your account will be easier to get into. Enter your password to turn it off."
      }
      actions={
        <>
          <Button type="submit" form="two-step-off" hierarchy="danger" size="xl" className="w-full" loading={busy} disabled={!value}>
            Turn off
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Keep it on
          </Button>
        </>
      }
    >
      <form id="two-step-off" noValidate onSubmit={submit}>
        <Field label={passwordless ? "Authenticator code" : "Password"} htmlFor={ids.secret.id} error={error} errorId={ids.secret.errorId}>
          {passwordless ? (
            <TextInput
              id={ids.secret.id}
              size="xl"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={value}
              onValueChange={(v) => {
                setValue(v);
                setWrong(false);
              }}
              {...errorProps(error, ids.secret.errorId)}
            />
          ) : (
            <PasswordInput
              id={ids.secret.id}
              autoComplete="current-password"
              value={value}
              onValueChange={(v) => {
                setValue(v);
                setWrong(false);
              }}
              {...errorProps(error, ids.secret.errorId)}
            />
          )}
        </Field>
      </form>
    </Sheet>
  );
}

/** AU-45 · A device: what it is, where, when it signed in and was last active; Sign out of this device. */
function DeviceSheet({
  open,
  device,
  me,
  onClose,
  onSignOut,
}: {
  open: boolean;
  device: DeviceRecord | "this" | null;
  me: ReturnType<typeof useThisDevice>;
  onClose: () => void;
  onSignOut: (d: DeviceRecord | "this") => void;
}) {
  const dates = useDates();
  const sessionAt = useSessionAt();
  const online = useOnline();
  if (!device) return null;
  const d =
    device === "this"
      ? { name: me.name, os: me.os, app: me.app, where: me.where, signedInAt: sessionAt, lastActive: 0, demo: false }
      : device;
  const when = (ts: number) => `${dates.date(ts, { style: "medium" })} · ${dates.time(ts)}`;
  const rows: [string, string][] = [
    ["Where", d.where || "Not known"],
    ["Signed in", d.signedInAt ? when(d.signedInAt) : "Not known"],
    ["Last active", device === "this" ? "Now" : d.lastActive ? dates.date(d.lastActive, { style: "medium" }) : "Not known"],
  ];
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={device === "this" ? `${d.name} · ${PHONE_OS.has(d.os) ? "This phone" : "This device"}` : d.name}
      description={[d.os, d.app].filter(Boolean).join(" · ")}
      actions={
        <>
          <Button hierarchy="secondary" size="xl" className="w-full" disabled={!online} onClick={() => onSignOut(device)}>
            Sign out of this device
          </Button>
          <Button hierarchy="secondary" size="xl" className="w-full" onClick={onClose}>
            Close
          </Button>
        </>
      }
    >
      {d.demo && (
        <Badge tone="warning" className="self-start">
          Demo
        </Badge>
      )}
      <dl className="flex flex-col">
        {rows.map(([term, value]) => (
          <div key={term} className="flex items-start justify-between gap-6 py-4">
            <dt className={T.body}>{term}</dt>
            <dd className={cn(T.body, "text-right text-text-primary")}>{value}</dd>
          </div>
        ))}
      </dl>
    </Sheet>
  );
}
