import { useContext, useEffect, useState } from "react"
import { Organizer } from "./application/Orgnizer"
import {organizerContext} from './App'
import { useNavigate } from "react-router-dom"
import logoutIcon from "./assets/logout.svg"
import {useAuth} from "./auth/AuthContext"
import {UserDashboard} from './components/user-dashboard-list'
import { useTranslation } from "react-i18next"
import { LanguageSwitcher } from "./components/LanguageSwitcher"

export function Home(){
    const { t } = useTranslation();
    const navigate = useNavigate()
    const {logout} = useAuth()

    return(
        <div className="bg-white min-h-dvh">
            <header className="bg-blue-800 text-white font-bold p-4 flex justify-between items-center">

            <h1 className="text-xl sm:text-2xl md:text-4xl text-center">{t('passportRenewalService')}</h1>
            <div className="flex items-center space-x-2 sm:space-x-4">
              <LanguageSwitcher />
              <button className="w-8 h-8 sm:w-10 sm:h-10 flex justify-center items-center cursor-pointer" onClick={logout}><img  src={logoutIcon} alt="logout icon"></img></button>
            </div>
            </header>
            <div className=" text-gray-950 flex justify-center items-center h-full m-4 p-6 sm:m-10 sm:p-10 border-2 border-gray-400 border-dashed dash rounded-2xl">
                <button className="btn btn-primary" onClick={()=>{navigate('/application')}}>{t('startNewApplication')}</button>
            </div>
            
                
            <UserDashboard/>

            
        </div>
    )
}