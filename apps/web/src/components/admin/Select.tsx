import * as RadixSelect from "@radix-ui/react-select";
import { Check, ChevronDown } from "lucide-react";
import type { ReactNode } from "react";
import { Field } from "./Field";

export type SelectOption = {
  value: string;
  label: ReactNode;
  disabled?: boolean;
};

export function Select({
  label,
  hint,
  error,
  value,
  onChange,
  options,
  placeholder,
}: {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
  value: string;
  onChange(value: string): void;
  options: SelectOption[];
  placeholder?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error}>
      <RadixSelect.Root value={value} onValueChange={onChange}>
        <RadixSelect.Trigger className="admin-select" aria-label={String(label ?? placeholder ?? "Select")}>
          <RadixSelect.Value placeholder={placeholder} />
          <RadixSelect.Icon>
            <ChevronDown size={16} />
          </RadixSelect.Icon>
        </RadixSelect.Trigger>
        <RadixSelect.Portal>
          <RadixSelect.Content className="admin-select__content" position="popper" sideOffset={6}>
            <RadixSelect.Viewport>
              {options.map((option) => (
                <RadixSelect.Item
                  className="admin-select__item"
                  disabled={option.disabled}
                  key={option.value}
                  value={option.value}
                >
                  <RadixSelect.ItemText>{option.label}</RadixSelect.ItemText>
                  <RadixSelect.ItemIndicator>
                    <Check size={14} />
                  </RadixSelect.ItemIndicator>
                </RadixSelect.Item>
              ))}
            </RadixSelect.Viewport>
          </RadixSelect.Content>
        </RadixSelect.Portal>
      </RadixSelect.Root>
    </Field>
  );
}
