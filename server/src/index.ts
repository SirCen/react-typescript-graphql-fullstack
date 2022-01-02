import { MikroORM } from "@mikro-orm/core";
import { COOKIE_NAME, __prod__ } from "./constants";
import microConfig from './mikro-orm.config';
import express from 'express';
import {ApolloServer} from 'apollo-server-express';
import {buildSchema} from 'type-graphql';
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";
import redis from 'redis';
import session from 'express-session';
import connectRedis from 'connect-redis';
import cors from 'cors';


const main = async () => {
    const orm = await MikroORM.init(microConfig);
    await orm.getMigrator().up();
    
    const app = express();
    
    const RedisStore = connectRedis(session);
    const redisClient = redis.createClient();
    //add session middleware 
    app.use(
        cors({
            origin: "http://localhost:3000", 
            credentials: true,
        })
    );
    app.use(
        session({
            name: COOKIE_NAME, //cookie name
            store: new RedisStore({client: redisClient, disableTouch: true,}), //touch resets TTL
            cookie: {
                maxAge: 1000 * 60 * 60 * 24 * 28,//28 days
                httpOnly: true,
                sameSite: 'lax', //csrf
                secure: __prod__, //cookie only works in https
            },
            saveUninitialized: false,
            secret: "cwjkhgzmfltmrkgmlrla", //change to environment var
            resave: false,
        })
    );

    const apolloserver = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver, PostResolver, UserResolver],
            validate: false
        }),
        context: ({req, res}) => ({em: orm.em, req, res}),
    });
    //add apollo middleware
    apolloserver.applyMiddleware({app, cors:false});

    app.listen(4000, () => {
        console.log('server started on localhost:4000');
    });
};

main();