import "reflect-metadata";
import { ApolloServer } from "apollo-server-express";
import express from "express";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import cors from "cors";
import dotenv from "dotenv";
import routes from "./routes";
dotenv.config();

// import { send } from "process";

const main = async () => {
	const app = express();

	if (process.env.NODE_ENV === "development") {
		// config.development;
		await createConnection({
			type: "mysql",
			host: "127.0.0.1",
			// port: process.env.DB_PORT,
			username: process.env.LOCAL_DATABASE_USERNAME,
			password: process.env.LOCAL_DATABASE_PASSWORD,
			database: process.env.LOCAL_DATABASE_NAME,
			synchronize: true,
			logging: false,
			entities: ["src/entities/*.*"],
		});
	} else if (process.env.NODE_ENV === "deploy") {
		// const temp = config.deploy;
		await createConnection({
			type: "mysql",
			host: process.env.DB_HOST,
			// port: process.env.DB_PORT,
			username: process.env.DB_USERNAME,
			password: process.env.DB_PASSWORD,
			database: process.env.DB_DBNAME,
			synchronize: true,
			logging: true,
			entities: ["src/entities/*.*"],
		});
	}

	app.use(express.json());
	app.use(express.urlencoded({ extended: false }));

	const schema = await buildSchema({
		resolvers: [__dirname + "/resolvers/*.ts"],
	});

	const apolloServer = new ApolloServer({
		schema,
		context: ({ req, res }: any) => ({ req, res }),
	});

	app.use(
		cors({
			credentials: true,
			origin: true,
			methods: ["GET", "POST", "OPTIONS"],
		})
	);

	app.use("/", routes);

	// apolloServer.start();
	apolloServer.applyMiddleware({ app });

	const PORT = 4000;
	app.listen(PORT, () => console.log(`Server is up on port ${PORT}/graphql`));
};

main();