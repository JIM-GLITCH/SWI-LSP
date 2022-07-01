import { match, P } from 'ts-pattern';
match({a:1,b:2})
    .with({a:P.select()},(keke)=>console.log(keke))
    .with({b:1},()=>console.log(2))
	.otherwise(()=>{})