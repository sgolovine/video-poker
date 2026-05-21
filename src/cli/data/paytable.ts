import type {PaytableRow} from '../types/ui.js';

export const paytableRows: PaytableRow[] = [
	{hand: 'ROYAL FLUSH', payouts: {1: 8000, 2: 16_000, 3: 24_000, 4: 32_000, 5: 40_000}},
	{hand: 'STRAIGHT FLUSH', payouts: {1: 500, 2: 1000, 3: 1500, 4: 2000, 5: 2500}},
	{hand: '4 OF A KIND', payouts: {1: 250, 2: 500, 3: 750, 4: 1000, 5: 1250}},
	{hand: 'FULL HOUSE', payouts: {1: 90, 2: 180, 3: 270, 4: 360, 5: 450}},
	{hand: 'FLUSH', payouts: {1: 50, 2: 100, 3: 150, 4: 200, 5: 250}},
	{hand: 'STRAIGHT', payouts: {1: 40, 2: 80, 3: 120, 4: 160, 5: 200}},
	{hand: '3 OF A KIND', payouts: {1: 30, 2: 60, 3: 90, 4: 120, 5: 150}},
	{hand: 'TWO PAIR', payouts: {1: 20, 2: 40, 3: 60, 4: 80, 5: 100}},
	{hand: 'JACKS OR BETTER', payouts: {1: 10, 2: 20, 3: 30, 4: 40, 5: 50}},
];
