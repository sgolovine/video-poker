import type {ButtonId} from './button-id.js';

export type ButtonConfig = {
	id: ButtonId;
	label: string;
	row: number;
	action: string;
};
