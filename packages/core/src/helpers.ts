import type {
  Errors,
  Extender,
  FieldValue,
  FormConfig,
  Obj,
  Stores,
  Touched,
  ValidationFunction,
  TransformFunction,
} from '@felte/common';
import {
  deepSet,
  executeValidation,
  getPath,
  isFormControl,
  setControlValue,
  setForm,
  _cloneDeep,
  _defaultsDeep,
  _get,
  _merge,
  _set,
  _unset,
} from '@felte/common';
import { get } from 'svelte/store';

type CreateHelpersOptions<Data extends Obj> = {
  config: FormConfig<Data>;
  stores: Stores<Data>;
  extender: Extender<Data>[];
  addValidator(validator: ValidationFunction<Data>): void;
  addTransformer(transformer: TransformFunction<Data>): void;
};

export function createHelpers<Data extends Obj>({
  stores,
  config,
}: CreateHelpersOptions<Data>) {
  const { data, touched, errors } = stores;

  function setTouched(fieldName: string, index?: number): void {
    const path =
      typeof index === 'undefined' ? fieldName : `${fieldName}[${index}]`;
    touched.update(($touched) => _set($touched, path, true));
  }

  function setError(path: string, error: string | string[]): void {
    errors.update(($errors) => _set($errors, path, error));
  }

  function setField(path: string, value?: FieldValue, touch = true): void {
    data.update(($data) => _set($data, path, value));
    if (touch) setTouched(path);
    if (!formNode) return;
    for (const control of formNode.elements) {
      if (!isFormControl(control) || !control.name) continue;
      const elName = getPath(control);
      if (path !== elName) continue;
      setControlValue(control, value);
      return;
    }
  }

  function setFields(values: Data): void {
    data.set(_cloneDeep(values));
    if (formNode) setForm(formNode, values);
  }

  async function validate(): Promise<Errors<Data> | void> {
    const currentData = get(data);
    touched.update((t) => {
      return deepSet<Touched<Data>, boolean>(t, true) as Touched<Data>;
    });
    const currentErrors = await executeValidation(currentData, config.validate);
    errors.set(currentErrors || {});
    return currentErrors;
  }

  let formNode: HTMLFormElement | undefined;
  let initialValues = config.initialValues ?? ({} as Data);

  function reset(): void {
    setFields(_cloneDeep(initialValues));
    touched.update(($touched) => deepSet($touched, false) as Touched<Data>);
  }

  return {
    public: {
      reset,
      setTouched,
      setError,
      setField,
      setFields,
      validate,
    },
    private: {
      _setFormNode: (node: HTMLFormElement) => {
        formNode = node;
      },
      _getFormNode: () => formNode,
      _getInitialValues: () => initialValues,
      _setInitialValues: (values: Data) => {
        initialValues = values;
      },
    },
  };
}
