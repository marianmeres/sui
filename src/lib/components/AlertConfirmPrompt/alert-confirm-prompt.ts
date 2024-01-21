import { createStore } from '@marianmeres/store';
import type { THC } from '../Thc/Thc.svelte';
import { createClog } from '@marianmeres/clog';

const clog = createClog('alert-confirm-prompt');

// export class AlertConfirmPromptType {
// 	static readonly ALERT: 'alert';
// 	static readonly CONFIRM: 'confirm';
// 	static readonly PROMPT: 'prompt';
// }

export enum AlertConfirmPromptType {
	ALERT = 'alert',
	CONFIRM = 'confirm',
	PROMPT = 'prompt',
}

// basically a label for color scheme and icon
export type AlertConfirmPromptVariant = 'info' | 'success' | 'warn' | 'error';

type FnOnOK = (value: any) => any;
type FnOnCancel = (value: false) => any;
type FnOnEscape = () => undefined;
type FnOnCustom = (value: any) => any;

export interface AlertConfirmPromptOptions extends Record<string, any> {
	//keyof AlertConfirmPromptType;
	type:
		| AlertConfirmPromptType.ALERT
		| AlertConfirmPromptType.CONFIRM
		| AlertConfirmPromptType.PROMPT;
	//
	title: THC;
	content: THC;
	//
	value: any;
	//
	labelOk: THC;
	onOk: FnOnOK;
	//
	labelCancel: THC;
	onCancel: FnOnCancel;
	// so we can distinguish the escape key hit (native browser sometimes does)
	onEscape: FnOnEscape;
	// optional custom 3rd button label + handler
	labelCustom?: THC;
	onCustom?: FnOnCustom;
	//
	promptFieldProps?: any;
	// visuals
	variant: AlertConfirmPromptVariant;
	iconFn: (() => string) | boolean; // true means default
	class?: Partial<{
		dialog: string;
		icon: string;
		contentBlock: string;
		title: string;
		content: string;
		inputBox: string;
		inputField: string;
		menu: string;
		menuLi: string;
		button: string;
		spinnerBox: string;
	}>;
	//
	forceAsHtml?: boolean;
}

const isFn = (v: any) => typeof v === 'function';
const ucf = (s: string) => `${s}`[0].toUpperCase() + `${s}`.slice(1);

export const createAlertConfirmPromptStore = () => {
	// fifo
	const _stack = createStore<AlertConfirmPromptOptions[]>([]);

	// defaults
	const labelOk = 'OK';
	const labelCancel = 'Cancel';

	// optional 3rd button label
	const labelCustom = undefined;

	const push = (o: Partial<AlertConfirmPromptOptions>) => {
		if (!isFn(o.onOk)) o.onOk = shift as any;
		if (!isFn(o.onCancel)) o.onCancel = shift as any;
		if (!isFn(o.onEscape)) o.onEscape = shift as any;
		if (o.labelOk === undefined) o.labelOk = labelOk;
		if (o.labelCancel === undefined) o.labelCancel = labelCancel;
		if (o.title === undefined) o.title = ucf(o.type as string);

		// variant defaults to info
		if (!['info', 'success', 'warn', 'error'].includes(o?.variant as string)) {
			o.variant = 'info';
		}

		if (o.iconFn === undefined) o.iconFn = true; // will use default

		// 3rd label may stay undefined
		if (!isFn(o.onCustom)) o.onCustom = () => undefined;

		//
		_stack.update((old) => [...old, o] as AlertConfirmPromptOptions[]);
	};

	const shift = () =>
		_stack.update((old) => {
			old.shift();
			return [...old];
		});

	const reset = (stack: AlertConfirmPromptOptions[] = []) => _stack.set(stack);

	const escape = () => {
		if (_stack.get().length) _stack.get()[0].onEscape();
		shift();
	};

	return {
		subscribe: _stack.subscribe,
		get: _stack.get,
		push,
		shift,
		reset,
		escape,
		// human alias
		close: shift,

		// sugar below

		//
		alert: (o?: Partial<AlertConfirmPromptOptions> | string) => {
			if (typeof o === 'string') o = { title: o };
			push({ ...(o || {}), type: AlertConfirmPromptType.ALERT });
		},
		//
		confirm: (onOk: FnOnOK, o?: Partial<AlertConfirmPromptOptions>) =>
			push({ onOk, value: false, ...o, type: AlertConfirmPromptType.CONFIRM }),
		//
		prompt: (onOk: FnOnOK, o?: Partial<AlertConfirmPromptOptions>) =>
			push({ onOk, value: '', ...o, type: AlertConfirmPromptType.PROMPT }),
	};
};

// sugar helpers to patch the native window.alert/confirm/prompt

export const createAlert =
	(
		acp: ReturnType<typeof createAlertConfirmPromptStore>,
		defaults?: Partial<AlertConfirmPromptOptions>
	) =>
	// allowing to add the custom param outside of the native signature
	(message: string, o?: Partial<AlertConfirmPromptOptions>) =>
		new Promise((resolve) =>
			acp.alert({
				...(defaults || {}),
				onOk: () => {
					acp.close();
					resolve(undefined);
				},
				content: message,
				onEscape: () => {
					acp.close();
					resolve(undefined);
				},
				...(o || {}),
			})
		);

export const createConfirm =
	(
		acp: ReturnType<typeof createAlertConfirmPromptStore>,
		defaults?: Partial<AlertConfirmPromptOptions>
	) =>
	// allowing to add the custom param outside of the native signature
	(message: string, o?: Partial<AlertConfirmPromptOptions>) =>
		new Promise((resolve) =>
			acp.confirm(
				() => {
					acp.close();
					resolve(true);
				},
				{
					...(defaults || {}),
					content: message,
					onCancel: () => {
						acp.close();
						resolve(false);
					},
					onEscape: () => {
						acp.close();
						resolve(false);
					},
					...(o || {}),
				}
			)
		);

export const createPrompt =
	(
		acp: ReturnType<typeof createAlertConfirmPromptStore>,
		defaults?: Partial<AlertConfirmPromptOptions>
	) =>
	// allowing to add the custom param outside of the native signature
	(message: string, defaultValue: string = '', o?: Partial<AlertConfirmPromptOptions>) =>
		new Promise((resolve) =>
			acp.prompt(
				(value: string) => {
					acp.close();
					resolve(value);
				},
				{
					...(defaults || {}),
					content: message,
					value: defaultValue,
					onCancel: () => {
						acp.close();
						resolve(null);
					},
					onEscape: () => {
						acp.close();
						resolve(null);
					},
					...(o || {}),
				}
			)
		);
