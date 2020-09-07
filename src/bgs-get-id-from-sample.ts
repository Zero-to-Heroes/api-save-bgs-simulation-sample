/* eslint-disable @typescript-eslint/no-use-before-define */
import { getConnection as getConnectionBgs } from './services/rds-bgs';
import { encode } from './services/utils';

// This example demonstrates a NodeJS 8.10 async handler[1], however of course you could use
// the more traditional callback-style handler.
// [1]: https://aws.amazon.com/blogs/compute/node-js-8-10-runtime-now-available-in-aws-lambda/
export default async (event): Promise<any> => {
	try {
		// console.log('processing event', event);
		const encoded = encode(event.body);

		const mysqlBgs = await getConnectionBgs();

		// Check if this sample already exists in db
		const dbResults: any[] = await mysqlBgs.query(
			`
				SELECT id FROM bgs_simulation_samples
				WHERE sample = '${encoded}'
			`,
		);

		if (dbResults && dbResults.length > 0) {
			// console.log('found existing sample, returning id', dbResults[0]);
			return {
				statusCode: 200,
				body: JSON.stringify(dbResults[0].id),
			};
		}

		const insertionResult: any = await mysqlBgs.query(
			`
				INSERT INTO bgs_simulation_samples (sample)
				VALUES ('${encoded}')
			`,
		);
		console.log('inserted', insertionResult);
		// const insertedData = await mysqlBgs.query(
		// 	`
		// 		SELECT id FROM bgs_simulation_samples
		// 		WHERE sample = '${encoded}'
		// 	`,
		// );
		const response = {
			statusCode: 200,
			body: JSON.stringify(insertionResult.insertId),
		};
		// console.log('sending back success reponse');
		return response;
	} catch (e) {
		console.error('issue saving sample', e);
		const response = {
			statusCode: 500,
			isBase64Encoded: false,
			body: null,
		};
		console.log('sending back error reponse', response);
		return response;
	}
};
