import type { CreateUserAttrs } from '$services/types';
import { genId } from '$services/utils';
import { client } from '$services/redis';
import { usersKey, usernamesUniqueKey, usernamesKey } from '$services/keys';
export const getUserByUsername = async (username: string) => {
	const decimalId = await client.zScore(usernamesKey(), username);

	if (!decimalId) {
		throw new Error('user does not exist');
	}

	const id = decimalId.toString(16);

	const user = await client.hGetAll(usersKey(id));

	return deserialize(id, user);
};

export const getUserById = async (id: string) => {
	const user = await client.hGetAll(usersKey(id));

	return deserialize(id, user);
};

export const createUser = async (attrs: CreateUserAttrs) => {
	const id = genId();
	//see if the username is already in the set of usernames
	const exists = await client.sIsMember(usernamesUniqueKey(), attrs.username);
	if (exists) {
		throw new Error('username is taken');
	}

	await client.hSet(usersKey(id), serialize(attrs)); //hash

	await client.sAdd(usernamesUniqueKey(), attrs.username); //set

	await client.zAdd(usernamesKey(), {
		//sorted set
		value: attrs.username,
		score: parseInt(id, 16)
	});
	return id;
};

const serialize = (user: CreateUserAttrs) => {
	return {
		username: user.username,
		password: user.password
	};
};

const deserialize = (id: string, user: { [key: string]: string }) => {
	return {
		id,
		username: user.username,
		password: user.password
	};
};
