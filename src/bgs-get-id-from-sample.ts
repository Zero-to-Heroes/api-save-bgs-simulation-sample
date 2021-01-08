/* eslint-disable @typescript-eslint/no-use-before-define */
import SqlString from 'sqlstring';
import { getConnection as getConnectionBgs } from './services/rds-bgs';
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
	try {
		console.log('processing event', event);
		// Preflight
		if (!event.body) {
			const response = {
				statusCode: 200,
				body: null,
				headers: headers,
			};
			console.log('sending back success response without body', response);
			return response;
		}
		const encoded = encode(event.body);

		const escape = SqlString.escape;
		const mysqlBgs = await getConnectionBgs();

		// Check if this sample already exists in db
		const dbResults: any[] = await mysqlBgs.query(
			`
				SELECT id FROM bgs_simulation_samples
				WHERE sample = ${escape(encoded)}
			`,
		);

		if (dbResults && dbResults.length > 0) {
			console.log('found existing sample, returning id');
			return {
				statusCode: 200,
				body: JSON.stringify(dbResults[0].id),
				headers: headers,
			};
		}

		const insertionResult: any = await mysqlBgs.query(
			`
				INSERT INTO bgs_simulation_samples (sample)
				VALUES (${escape(encoded)})
			`,
		);
		console.log('inserted', insertionResult);
		await mysqlBgs.end();
		// const insertedData = await mysqlBgs.query(
		// 	`
		// 		SELECT id FROM bgs_simulation_samples
		// 		WHERE sample = '${encoded}'
		// 	`,
		// );
		const response = {
			statusCode: 200,
			body: JSON.stringify(insertionResult.insertId),
			headers: headers,
		};
		console.log('sending back success reponse', response);
		return response;
	} catch (e) {
		console.error('issue saving sample', e);
		const response = {
			statusCode: 500,
			isBase64Encoded: false,
			body: null,
			headers: headers,
		};
		console.log('sending back error reponse', response);
		return response;
	}
};
