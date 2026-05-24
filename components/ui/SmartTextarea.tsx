"use client";

import { forwardRef, type TextareaHTMLAttributes } from "react";
import { handleSmartTextInput } from "@/lib/text-substitutions";
import { cn } from "@/lib/cn";

type SmartTextareaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  "onChange"
> & {
  onChange: (value: string) => void;
};

export const SmartTextarea = forwardRef<HTMLTextAreaElement, SmartTextareaProps>(
  function SmartTextarea({ className, value, onChange, ...props }, ref) {
    return (
      <textarea
        {...props}
        ref={ref}
        value={value}
        onChange={(event) => {
          handleSmartTextInput(event.currentTarget, event.target.value, onChange);
        }}
        className={cn(className)}
      />
    );
  }
);

type SmartInputProps = Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "onChange"
> & {
  onChange: (value: string) => void;
};

export const SmartInput = forwardRef<HTMLInputElement, SmartInputProps>(
  function SmartInput({ className, value, onChange, ...props }, ref) {
    return (
      <input
        {...props}
        ref={ref}
        value={value}
        onChange={(event) => {
          handleSmartTextInput(event.currentTarget, event.target.value, onChange);
        }}
        className={cn(className)}
      />
    );
  }
);
