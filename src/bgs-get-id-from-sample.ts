/* eslint-disable @typescript-eslint/no-use-before-define */
import { getConnection } from '@firestone-hs/aws-lambda-utils';
import SqlString from 'sqlstring';
import { encode } from './services/utils';

// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.
// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event): Promise<any> => {
	const headers = {
		'Access-Control-Allow-Headers':
			'Accept,Accept-Language,Content-Language,Content-Type,Authorization,x-correlation-id,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token',
		'Access-Control-Expose-Headers': 'x-my-header-out',
		'Access-Control-Allow-Methods': 'DELETE,GET,HEAD,OPTIONS,PATCH,POST,PUT',
		'Access-Control-Allow-Origin': event.headers.Origin || event.headers.origin,
	};
	// Preflight
	if (!event.body) {
		const response = {
			statusCode: 200,
			body: null,
			headers: headers,
		};
		return response;
	}
	const encoded = encode(event.body);

	const escape = SqlString.escape;

	// Check if this sample already exists in db
	const mysql = await getConnection();
	const dbResults: any[] = await mysql.query(
		`
			SELECT id FROM bgs_simulation_samples
			WHERE sample = ${escape(encoded)}
		`,
	);

	if (dbResults && dbResults.length > 0) {
		await mysql.end();
		return {
			statusCode: 200,
			body: JSON.stringify(dbResults[0].id),
			headers: headers,
		};
	}

	const insertionResult: any = await mysql.query(
		`
			INSERT INTO bgs_simulation_samples (sample)
			VALUES (${escape(encoded)})
		`,
	);
	await mysql.end();

	const response = {
		statusCode: 200,
		body: JSON.stringify(insertionResult.insertId),
		headers: headers,
	};
	return response;
};
