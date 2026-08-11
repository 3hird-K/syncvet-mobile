import { useCallback, useState } from 'react';
import type { ValidationRule } from '@lib/validation';
import { runRules } from '@lib/validation';

interface FieldConfig {
  value: string;
  rules: ValidationRule[];
  touched: boolean;
  error?: string;
}

type FormFields<T extends Record<string, string>> = {
  [K in keyof T]: FieldConfig;
};

type FieldName = string;

export function useForm<T extends Record<string, string>>(
  initialValues: T,
  validation: Record<keyof T, ValidationRule[]>,
) {
  const [fields, setFields] = useState<FormFields<T>>(() => {
    const next = {} as FormFields<T>;
    (Object.keys(initialValues) as (keyof T)[]).forEach((key) => {
      next[key] = { value: initialValues[key], rules: validation[key], touched: false };
    });
    return next;
  });

  const setValue = useCallback((name: FieldName, value: string) => {
    setFields((prev) => {
      const key = name as keyof T;
      if (!(key in prev)) return prev;
      const field = prev[key];
      const error = field.touched ? runRules(value, field.rules) : undefined;
      return { ...prev, [key]: { ...field, value, error } };
    });
  }, []);

  const validateField = useCallback((name: FieldName) => {
    setFields((prev) => {
      const key = name as keyof T;
      if (!(key in prev)) return prev;
      const field = prev[key];
      const error = runRules(field.value, field.rules);
      return { ...prev, [key]: { ...field, touched: true, error } };
    });
    return fields[name as keyof T].value;
  }, [fields]);

  const validateAll = useCallback(() => {
    let valid = true;
    setFields((prev) => {
      const next = { ...prev };
      (Object.keys(next) as FieldName[]).forEach((name) => {
        const key = name as keyof T;
        const error = runRules(next[key].value, next[key].rules);
        next[key] = { ...next[key], touched: true, error };
        if (error) valid = false;
      });
      return next;
    });
    return valid;
  }, []);

  const setFieldError = useCallback((name: FieldName, error?: string) => {
    setFields((prev) => {
      const key = name as keyof T;
      if (!(key in prev)) return prev;
      return { ...prev, [key]: { ...prev[key], touched: true, error } };
    });
  }, []);

  const getValues = useCallback(() => {
    const values = {} as T;
    (Object.keys(fields) as FieldName[]).forEach((name) => {
      (values as Record<string, string>)[name] = fields[name as keyof T].value;
    });
    return values;
  }, [fields]);

  const reset = useCallback(() => {
    setFields((prev) => {
      const next = {} as FormFields<T>;
      (Object.keys(prev) as (keyof T)[]).forEach((key) => {
        next[key] = { value: initialValues[key], rules: validation[key], touched: false };
      });
      return next;
    });
  }, [initialValues, validation]);

  return {
    fields,
    setValue,
    validateField,
    validateAll,
    setFieldError,
    getValues,
    reset,
  };
}
