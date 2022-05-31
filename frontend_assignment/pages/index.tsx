import detectEthereumProvider from "@metamask/detect-provider"
import { Strategy, ZkIdentity } from "@zk-kit/identity"
import { generateMerkleProof, Semaphore } from "@zk-kit/protocols"
import { providers } from "ethers"
import Head from "next/head"
import React, { useEffect } from "react"
import styles from "../styles/Home.module.css"
import { useForm, SubmitHandler, Controller} from "react-hook-form";
import * as yup from 'yup';
import{yupResolver} from "@hookform/resolvers/yup"
import {TextField} from "@material-ui/core"




const userSchema = yup.object().shape({
    name: yup.string().required(),
    age: yup.number().required().positive().integer(),
   address: yup.string().required(),
});

    
type Profile = {
    name : string
    age : number
    address : string
  }

export default function Home() {
    const [logs, setLogs] = React.useState("Connect your wallet and greet!")
    const [sentGreet, setSentGreet] = React.useState("Your Greeting is here")
   
    const {register, control, handleSubmit, watch, formState: { errors }} = useForm<Profile>({
        resolver: yupResolver(userSchema),
    });

   
    const formSubmitHandler: SubmitHandler<Profile> =  (data) => {
        
        console.log("Form data is", data)
    }
   
   
    
   
    
  

    async function greet() {
        setLogs("Creating your Semaphore identity...")
        setSentGreet("Hey everyone")
        const provider = (await detectEthereumProvider()) as any

        await provider.request({ method: "eth_requestAccounts" })

        const ethersProvider = new providers.Web3Provider(provider)
        const signer = ethersProvider.getSigner()
        const message = await signer.signMessage("Sign this message to create your identity!")

        const identity = new ZkIdentity(Strategy.MESSAGE, message)
        const identityCommitment = identity.genIdentityCommitment()
        const identityCommitments = await (await fetch("./identityCommitments.json")).json()

        const merkleProof = generateMerkleProof(20, BigInt(0), identityCommitments, identityCommitment)

        setLogs("Creating your Semaphore proof...")
        const greeting = "Hello world"

        const witness = Semaphore.genWitness(
            identity.getTrapdoor(),
            identity.getNullifier(),
            merkleProof,
            merkleProof.root,
            greeting
        )

        const { proof, publicSignals } = await Semaphore.genProof(witness, "./semaphore.wasm", "./semaphore_final.zkey")
        const solidityProof = Semaphore.packToSolidityProof(proof)

        const response = await fetch("/api/greet", {
            method: "POST",
            body: JSON.stringify({
                greeting,
                nullifierHash: publicSignals.nullifierHash,
                solidityProof: solidityProof
            })
        })

        if (response.status === 500) {
            const errorMessage = await response.text()

            setLogs(errorMessage)
        } else {
            setLogs("Your anonymous greeting is onchain :)")
        }
    }

    return (
        <div className={styles.container}>
            <Head>
                <title>Greetings</title>
                <meta name="description" content="A simple Next.js/Hardhat privacy application with Semaphore." />
                <link rel="icon" href="/favicon.ico" />
            </Head>

            <main className={styles.main}>
                <h1 className={styles.title}>Greetings</h1>

                <p className={styles.description}>A simple Next.js/Hardhat privacy application with Semaphore.</p>

                <div className={styles.logs}>{logs}</div>

                <div onClick={() => greet()} className={styles.button}>
                    Greet
                </div>
                <div>
                <>
			    <TextField 
				type='text' 
				defaultValue= {sentGreet}
				variant='outlined'
				inputProps={
					{ readOnly: true, }
				}
			    />
		        </>
                </div>
                <br></br>
                <form  onSubmit= {handleSubmit(formSubmitHandler)}>
                <Controller name= "name" control= {control} 
                render= {({field}) =>(
                  <TextField{...field} label = "name" variant = "outlined" error = {!!errors.name}
                  helperText= { errors.name ? errors.name?.message : ""}
                />
                )}
                />
                <br />
                <Controller name= "age" control= {control} 
                render= {({field}) =>(
                  <TextField{...field} label = "age" variant = "outlined" error = {!!errors.age}
                  helperText= { errors.age ? errors.age?.message : ""}
                />
                )}
                />
                <br />
                <Controller name= "address" control= {control} 
                render= {({field}) =>(
                  <TextField{...field} label = "address" variant = "outlined" error = {!!errors.address}
                  helperText= { errors.address ? errors.address?.message : ""}
                />
                )}
                />
                <br />
                <input type= "submit" value = "Submit" className= {styles.button}/>
                </form>
                </main>
                </div>
    )
}

