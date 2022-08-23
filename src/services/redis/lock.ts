import { randomBytes } from 'crypto';
import { client } from './client';

export const withLock = async (key: string, cb: (redisClient: Client, signal: any) => any) => {
	//initialize a few variables to control rtry behavior
	const retryDelayMs = 100;
	``;
	let retries = 20;
	const timeoutMs = 2000;

	//generate a random value to store lock key
	const token = randomBytes(6).toString('hex');
	//create the lock key
	const lockKey = `lock:${key}`;
	//set up a while loop to implement the retry behavior
	while (retries >= 0) {
		retries--;

		//try to do a SET NX operation
		const acquired = await client.set(lockKey, token, {
			NX: true,
			PX: timeoutMs
		});

		if (!acquired) {
			//ELSE brief pause(retryDelayMs) and then retry
			await pause(retryDelayMs);
			continue;
		}

		//IF the set is successful, then run the callback
		try {
			const signal = { expired: false };
			setTimeout(
				() => {
					signal.expired = true;
				},
				timeoutMs //same as PX
			);
			const proxiedClient = buildClientProxy(timeoutMs);
			const result = await cb(proxiedClient, signal);
			return result;
		} finally {
			//Unset the locked set
			await client.unlock(lockKey, token);
		}
	}
};

type Client = typeof client;

const buildClientProxy = (timeoutMs: number) => {
	const startTime = Date.now();

	const handler = {
		get(target: Client, prop: keyof Client) {
			if (Date.now() >= startTime + timeoutMs) {
				throw new Error('Lock has expired.');
			}

			const value = target[prop];
			return typeof value === 'function' ? value.bind(target) : value;
		}
	};
	return new Proxy(client, handler) as Client;
};

const pause = (duration: number) => {
	return new Promise((resolve) => {
		setTimeout(resolve, duration);
	});
};
