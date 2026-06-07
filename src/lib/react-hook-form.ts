import { useState, useCallback } from "react";

export function zodResolver(schema: any) {
  return async (values: any) => {
    const result = schema.safeParse(values);
    if (result.success) {
      return { values: result.data, errors: {} };
    } else {
      const fieldErrors: Record<string, any> = {};
      result.error.issues.forEach((issue: any) => {
        const path = issue.path.join(".");
        fieldErrors[path] = { message: issue.message };
      });
      return { values: {}, errors: fieldErrors };
    }
  };
}

export function useForm<T extends Record<string, any> = any>({
  defaultValues = {} as any,
  resolver,
}: {
  defaultValues?: T;
  resolver?: (values: T) => Promise<{ values: any; errors: any }>;
} = {}) {
  const [values, setValues] = useState<T>({ ...defaultValues });
  const [errors, setErrors] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const register = (name: string) => {
    return {
      name,
      value: (values as any)[name] ?? "",
      onChange: (e: any) => {
        const val =
          e.target.type === "checkbox" ? e.target.checked : e.target.value;
        setValues((prev) => ({ ...prev, [name]: val }));
        
        // Clear field error on change
        if (errors[name]) {
          setErrors((prev) => {
            const next = { ...prev };
            delete next[name];
            return next;
          });
        }
      },
      onBlur: () => {},
    };
  };

  const setValue = useCallback((name: string, value: any) => {
    setValues((prev) => ({ ...prev, [name]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }, []);

  const getValues = useCallback(() => values, [values]);

  const reset = useCallback(
    (newValues?: any) => {
      setValues(newValues || { ...defaultValues });
      setErrors({});
    },
    [defaultValues]
  );

  const handleSubmit = (onSubmit: (data: T) => any) => {
    return async (e?: React.FormEvent) => {
      if (e) {
        e.preventDefault();
        e.stopPropagation();
      }
      setIsSubmitting(true);

      let finalValues = values;
      let formErrors = {};

      if (resolver) {
        const resolverResult = await resolver(values);
        formErrors = resolverResult.errors;
        if (Object.keys(formErrors).length === 0) {
          finalValues = resolverResult.values;
        }
      }

      setErrors(formErrors);

      if (Object.keys(formErrors).length === 0) {
        try {
          await onSubmit(finalValues);
        } catch (error) {
          console.error("Form submit error:", error);
        }
      }
      setIsSubmitting(false);
    };
  };

  return {
    register,
    handleSubmit,
    setValue,
    getValues,
    reset,
    values,
    formState: { errors, isSubmitting },
  };
}
