import {useState, useEffect} from 'react'
import cancelImg from '../assets/cancel.svg'
import {BasicInformation} from './steps/BasicInformation'
import PersonalPhoto from './steps/PersonalPhoto'
import { useNavigate } from 'react-router-dom'
import { PassportPhoto } from './steps/PassportPhoto'
import {Signature} from './steps/Signature'
import {Location} from './steps/Location'
import { useAuth } from '../auth/AuthContext'
import { Review } from './steps/Review'
import { useTranslation } from 'react-i18next'
import { Loading } from '../components/Loading'

export function Organizer(){
    const {t} = useTranslation();
    const {user} = useAuth()
    const [loading, setLoading] = useState(false);
    //initializing variables for the whole application creation process
    const [fullnameEn, setFullnameEn] = useState("")
    const [fullnameAr, setFullnameAr] = useState("")
    const [passportNo, setPassportNo] = useState("")
    const [nationalNo, setNationalNo] = useState("")
    const [birthPlace, setBirthPlace] = useState("")
    const [birthday, setBirthday] = useState("")
    const [expiryDate, setExpiryDate] = useState("")
    const [issueDate, setIssueDate] = useState("")
    const [gender , setGender] = useState("")
    const [personalPhoto, setPersonalPhoto] = useState(null)
    const [passportPhoto, setPassportPhoto] = useState(null)
    const [signature, setSignature] = useState(null)
    const [location, setLocation] = useState("")
    const [inSudan, setInSudan] = useState('')
    const [step, setStep] = useState(0)
    const [isInitialLoad, setIsInitialLoad] = useState(true);

    // Load state from localStorage on component mount
    useEffect(() => {
        const savedData = localStorage.getItem('applicationFormData');
        console.log(JSON.parse(savedData));
        
        if (savedData) {
            const data = JSON.parse(savedData);
            setFullnameEn(data.fullnameEn || '');
            setFullnameAr(data.fullnameAr || '');
            setPassportNo(data.passportNo || '');
            setNationalNo(data.nationalNo || '');
            setBirthPlace(data.birthPlace || '');
            setBirthday(data.birthday || '');
            setExpiryDate(data.expiryDate || '');
            setIssueDate(data.issueDate || '');
            setGender(data.gender||'');
            setPersonalPhoto(data.personalPhoto || null);
            setPassportPhoto(data.passportPhoto || null);
            setSignature(data.signature || null);
            setLocation(data.location || '');
            setInSudan(data.inSudan || '');
            setStep(data.step || 0);
        }
        setIsInitialLoad(false);
    }, []); // Empty dependency array ensures this runs only once on mount

    // Save state to localStorage whenever it changes
    useEffect(() => {
        if (!isInitialLoad) {
            const applicationData = {
                fullnameEn,
                fullnameAr,
                passportNo,
                nationalNo,
                birthPlace,
                birthday,
                expiryDate,
                issueDate,
                gender,
                personalPhoto,
                passportPhoto,
                signature,
                location,
                inSudan,
                step
            };
            localStorage.setItem('applicationFormData', JSON.stringify(applicationData));
        }
    }, [isInitialLoad, fullnameEn, fullnameAr,passportNo, nationalNo, birthPlace, birthday, expiryDate, issueDate,gender, personalPhoto, passportPhoto, signature, location, inSudan, step]);


    const basicInfoPayload = {
        fullnameEn,setFullnameEn,
        fullnameAr,setFullnameAr,
        passportNo,setPassportNo,
        nationalNo, setNationalNo,
        birthPlace, setBirthPlace,
        birthday, setBirthday,
        expiryDate, setExpiryDate,
        issueDate, setIssueDate,
        gender, setGender
    }

  
    
    //local variables
    const stepList = [t('basicInformation'), t('personalPhoto'), t('passportPhoto'), t('signature'), t('location'), t('review')]
    const pages = [
        <BasicInformation payload={basicInfoPayload}/>, 
        <PersonalPhoto photo={[personalPhoto,setPersonalPhoto]}/>, 
        <PassportPhoto photo={[passportPhoto, setPassportPhoto]}/>,
        <Signature photo={[signature, setSignature]}/>,
        <Location location={[location,setLocation]} inSudan={[inSudan, setInSudan]}/>,
        <Review passport={{fullnameAr, fullnameEn,passportNo,personalPhoto,birthPlace,birthday,signature, gender}}/>
    ]
    const navigate = useNavigate()
     let stepComplete = [
        fullnameEn&& fullnameAr && passportNo && nationalNo && birthPlace && birthday && expiryDate&& issueDate && gender,
        personalPhoto !== null,
        passportPhoto !== null,
        signature !== null,
        location!=="",
        true
    ];
    stepComplete[0] = true;
    stepComplete[1] = true;
    stepComplete[2] = true;
    stepComplete[3] = true;
    stepComplete[4] = true;
    stepComplete[5] = true;

    const handlePrev = ()=>{
        if(step<=0){
            return
        }
        setStep(s=>s-1)
    }
    const handleNext = ()=>{
        
        
        if(step+1>=stepList.length){
            return
        }
        setStep(s=>s+1)
        
    }

    const handleSubmit= async()=>{
        setLoading(true);
        try{
            const response = await fetch(import.meta.env.VITE_REACT_APP_BACKEND_ROUTE+"/api/create-app",
            {
                method:"POST",
                headers:{
                    "Content-Type":"application/json"
                }, body:JSON.stringify({
                    "email":user.email,
                    'application':{
                        fullnameAr,
                        fullnameEn,
                        passportNo,
                        nationalNo,
                        birthPlace,
                        birthday,
                        issueDate,
                        expiryDate,
                        gender,
                        location,
                        signature,
                        passportPhoto,
                        personalPhoto
                    }
                })
            }
        )
        if (response.ok){
            localStorage.removeItem('applicationFormData');
            document.getElementById("success-modal").showModal()
        }

        }catch(error){
            console.log("error", error)
        } finally {
            setLoading(false);
        }
    }

    
    

    return(
        <div className='absolute w-full bg-blue-50 text-black  p-10 min-h-dvh flex flex-col justify-between align-middle'>
            {loading ? <Loading /> : (
                <div>
                    <header className="min-w-full flex flex-row justify-between bg-blue-800 p-5 rounded-2xl">
                        <h1 className='text-4xl text-white font-bold'>{t('createNewApplication')}</h1>
                        <button className=' w-10 h-10 justify-self-end cursor-pointer' onClick={() => {
                            document.getElementById('exit-modal').showModal()
                        }}>
                            <img src={cancelImg} alt="cancel Icon" />
                        </button>

                        <dialog id="exit-modal" className="modal">
                            <div className="modal-box bg-blue-100">
                                <h3 className="font-bold text-lg ">{t('areYouSureToExit')}</h3>
                                <p className="py-4">{t('exitWarning')}</p>
                                <div className="modal-backdrop modal-action" method="dialog">
                                    <button className='btn-primary btn' onClick={() => document.getElementById('exit-modal').close()}>{t('cancel')}</button>
                                    <button className='btn-error btn text-gray-100' onClick={() => {
                                        document.getElementById('exit-modal').close()
                                        navigate('/home')
                                    }}>{t('exit')}</button>
                                </div>
                            </div>
                        </dialog>
                    </header>
                    <ul className="steps w-full my-5 overflow-scroll space-x-5">
                        {stepList.map((title, index) => (
                            <li key={index} className={`step ${index <= step ? "step-primary" : ""}`}>{title}</li>
                        ))}
                    </ul>
                    <form onSubmit={e => e.preventDefault()}>
                        {pages[step]}
                    </form>
                    <div className="flex w-full justify-around mt-10">
                        <button disabled={step === 0} className={`btn btn-primary ${step === 0 ? 'disabled:btn-ghost' : ''}`} onClick={handlePrev}>{t('previous')}</button>
                        <button
                            disabled={!stepComplete[step]}
                            className="btn btn-primary disabled:btn-ghost"
                            onClick={step === stepList.length - 1 ? handleSubmit : handleNext} >
                            {step === stepList.length - 1 ? t('finish') : t('next')}
                        </button>
                        </div>
                </div>
            )}
            <dialog id="success-modal" className="modal">
                <div className="modal-box bg-green-600 text-white" >
                    <h3 className="font-bold text-lg">{t('applicationSuccessful')}</h3>
                    <p className="py-4">{t('youCanSeeItInHomePage')}</p>
                </div>
                <form method="dialog" className="modal-backdrop">
                    <button onClick={() => {
                        document.getElementById('success-modal').close()
                        navigate('/home')
                    }}>{t('close')}</button>
                </form>
            </dialog>
        </div>
    )

}