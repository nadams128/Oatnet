"use client";
import { useEffect, useState } from 'react';
import {useSearchParams, useNavigate, useLocation} from "react-router-dom";
import { serverDomain } from './App';

// get details of an inventory item from the backend
export async function getInventory(item: string){
	let serverResponse
	let sessionID = localStorage.getItem("sessionID")
	if(sessionID){
		// if there's no item specified in the url, send a request to the server along with the user's sessionID
		if (item === "" || item === "all" || item === undefined)
			serverResponse = await fetch(serverDomain+"/inv", {
				method: "GET",
				headers: {
					"sessionID": sessionID
				}
			})
		// if there is an item specified in the url, send a request to the server along with the user's sessionID
		else
			serverResponse = await fetch(serverDomain+"/inv?item="+item.replaceAll(" ", "").toLowerCase(), {
				method: "GET",
				headers: {
					"sessionID": sessionID
				}
			})
		return serverResponse.json()
	}
	else{
		return "No Session ID"
	}
}

// send a new/updated item to the server for storage
export async function postInventory(itemData: any[]){
	let sessionID = localStorage.getItem("sessionID")
	if(sessionID){
		// send item data to the server along with the sessionID
		await fetch(serverDomain+"/inv", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"sessionID": sessionID
			},
			body: JSON.stringify(itemData),
		})
	}
	else{
		return "No Session ID"
	}
}

// delete a new/existing item from the server
export async function deleteInventory(item: string){
	let sessionID = localStorage.getItem("sessionID")
	if(sessionID){
		// send delete request to the server along with the sessionID
		await fetch(serverDomain+"/inv?item="+item.replaceAll(" ", "").toLowerCase(), {
			method: "DELETE",
			headers: {
				"sessionID": sessionID
			}
		})
	}
	else{
		return "No Session ID"
	}
}

function Inventory() {
	const [serverData, setServerData] = useState<any[]>()
	const [searchQuery, setSearchQuery] = useState<string>()
	const [needAmount, setNeedAmount] = useState<string>()
	const [haveAmount, setHaveAmount] = useState<string>()
	const [checkWeekly, setCheckWeekly] = useState<boolean>(false)
	const [amountNeededWeekly, setAmountNeededWeekly] = useState<string>()
	const [settingsPanelOpen, setSettingsPanelOpen] = useState<boolean>(false)
	const [searchSuggestionsEnabled, setSearchSuggestionsEnabled] = useState<boolean>(false)
	const [editing, setEditing] = useState<boolean>(false)
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()
	const location = useLocation()
	/* 
		get an item's data from the server, and update the UI with the resulting data 

		if the user's input doesn't match an existing inventory item, keep the inputs empty
	*/
	function updateInputs(item: string) {
		setSearchQuery(item)
		if (item){
			getInventory(item).then((response) => {
				// if the server returned a valid response with an item name
				if (response[0] && response[0][1]){
					// if that item matches what the user has typed, update the inputs with the item data
					if (response[0][0] === item.replaceAll(" ","").toLowerCase()){
						setSearchSuggestionsEnabled(false)
						setSearchQuery(response[0][1])
						setHaveAmount(response[0][2])
						setNeedAmount(response[0][3])
						setCheckWeekly(response[0][4])
						setAmountNeededWeekly(response[0][5])
					}
					else{
						setSearchSuggestionsEnabled(true)
					}
				}
				setServerData(response)
			})
		}
		// if the search input is empty, don't give suggestions and keep the inputs empty
		else{
			setSearchSuggestionsEnabled(false)
			setHaveAmount("")
			setNeedAmount("")
			setCheckWeekly(false)
		}
	}
	// if the URL query parameters change, update the inputs accordingly
	// this does run when the component loads, because the useEffect() detects the searchParams changing when they initialize
	useEffect(() => {
		const item = searchParams.get('item')
		if(item){
			updateInputs(item)
			setEditing(true)
		}
		else{
			updateInputs("")
			setEditing(false)
		}
	}, [searchParams])

	// run a blank get item request to the server just to check perms, nothing else
	useEffect(() => {
		getInventory(("").replaceAll(" ", "-").toLowerCase()).then((response) => {
			setServerData(response)
		})
	},[])

	return(<>
		{/* if the server returned a response and doesn't indicate the user not having permissions, render inputs */}
		{serverData && serverData[0]!=="You don't have permissions for that!" ? <div>
		{/* if the have and needed amounts are loaded in, render */}
		{((haveAmount !== undefined && needAmount !== undefined)) && <div className="flex flex-col items-center mt-2 select-none">
			<div>
				{/* search box for items */}
				<input id="searchBox" readOnly={editing ? true : false} className="w-72 pl-1 bg-oatnet-foreground rounded-lg select-none" placeholder={location.pathname=='/add' ? 'Oats, Soap, Socks, etc.' : 'Search'} value={searchQuery ? searchQuery:""} list="searchResults" autoComplete="off" onChange={ e => {
					updateInputs(e.target.value)
				}}/>
				{/* the datalist is populated with search results based on the text in the input */}
				{searchSuggestionsEnabled && <datalist id="searchResults">
					{serverData && serverData.map((row) => {
						return <option key={row[1]}>{row[1]}</option>
					})}
				</datalist>}
			</div>

			{/* text input for the have property */}
			<div className="mt-6">
				<div className="w-12 float-left">Have: </div>
				<input id="haveBox" className="w-48 pl-1 bg-oatnet-foreground rounded-lg" placeholder='6oz, 4 pairs, ?, etc.' value={haveAmount ? haveAmount:""} autoComplete="off" onChange={e => {
					setHaveAmount(e.target.value)
				}}/>
			</div>
			{!!(checkWeekly && amountNeededWeekly) && <div className="mt-1">{"We need "+amountNeededWeekly+" of this item per serve :D"}</div>}
			{/* text input for the need property */}
			<div className="mt-2">
				<div className="w-12 float-left">Need: </div>
				<input id="needBox" className="w-48 pl-1 bg-oatnet-foreground rounded-lg" placeholder='6oz, 4 pairs, ?, etc.' value={needAmount ? needAmount:""} autoComplete="off" onChange={ e =>{
					setNeedAmount(e.target.value)
				}}/>
			</div>

			{/* button to submit data to the backend */}
			<button className="mt-6 ml-2 w-40 h-8 bg-oatnet-foreground rounded-lg" onClick={() => {
				if(searchQuery != "" && haveAmount != "" && needAmount != ""){
					let amountNeededWeeklyTemp = "0"
					if (amountNeededWeekly){
						amountNeededWeeklyTemp = amountNeededWeekly
					}
					postInventory([searchQuery, haveAmount, needAmount, checkWeekly, amountNeededWeeklyTemp]).then(()=>{
						// if there's a filter on this URL, the user should be sent back to the reports page
						if(searchParams.get("filter"))
							navigate("/report?filter="+searchParams.get('filter'))
					})
				}
				updateInputs("")
				setHaveAmount("")
				setNeedAmount("")
				setCheckWeekly(false)
				setAmountNeededWeekly("")
				setEditing(false)
			}}>
				{editing ? "Update" : "Submit"}
			</button>

			{/* collapsible panel for settings */}
			<div className={settingsPanelOpen ? "w-72 mt-3 border-solid border-4 border-oatnet-text rounded-lg" : "w-72 mt-4 ml-2"}>
				<button className="w-9 mt-1 mx-1 py-1 rounded-lg bg-oatnet-foreground inline-block" onClick={() => {
					setSettingsPanelOpen(!settingsPanelOpen)
				}}>
					{settingsPanelOpen ? "-": "+"}
				</button> 
				<div className="inline-block">
					<div className='mr-1 inline-block'>Settings:</div>
					{!settingsPanelOpen && <div className="w-36 h-1 mb-1 bg-oatnet-text rounded-lg inline-block"></div>}
				</div>
				{settingsPanelOpen && <div className="w-68 rounded-lg flex flex-col flex-wrap items-center">
					{/* input to set how many of an item we need to restock weekly */}
					<div className="mt-2 mx-1 mb-2">
						<div className="float-left">Needed Weekly:</div>
						<input id="amountNeededWeeklyInput" className="w-36 ml-2 px-1 bg-oatnet-foreground rounded-lg" placeholder='6oz, 4 pairs, ?, etc.' value={amountNeededWeekly ? amountNeededWeekly:""} autoComplete="off" onChange={e => {
							setAmountNeededWeekly(e.target.value)
						}}/>
					</div>
					{/* checkbox to mark an item as one to check the status of weekly */}
					<div className="flex items-center mt-1 mx-1 mb-2">
						<div className="">
							Check Weekly?:
						</div>
						<div className="w-5 h-5 ml-2 bg-oatnet-foreground rounded-md flex items-center justify-center" onClick={() => {
							setCheckWeekly(!checkWeekly)
						}}>
							{checkWeekly ? <img className="oatnet-text" src="/assets/check.svg" alt="Checkmark"/> : ""}
						</div>
					</div>
					{/* button to delete data from the server */}
					<button className="w-28 h-8 ml-1 mb-2 bg-red-600 rounded-lg" onClick={() => {
						if(searchQuery && searchQuery != ""){
							deleteInventory((searchQuery)).then(() => {
								// if there's a filter on this URL, the user should be sent back to the reports page
								if(searchParams.get("filter"))
									navigate("/report?filter="+searchParams.get('filter'))
							})
						}
						updateInputs("")
						setHaveAmount("")
						setNeedAmount("")
						setCheckWeekly(false)
					}}>
						Delete
					</button>
				</div>}
			</div>
		</div>}
		{/* if the user doesn't have permissions, let them know */}
		</div> : (serverData && serverData[0]==="You don't have permissions for that!") && <div className=" ml-8 mr-8 text-center">You don't have permissions to view this page! Please contact your Oatnet administrator for read and/or write permissions!</div>}
	</>)
}

export default Inventory
