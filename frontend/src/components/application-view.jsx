import closeIcon from '../assets/cancel_black.svg'
import { useState } from 'react';

export default function PassportModal({ isOpen, onClose, passportData }){
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  if (!isOpen || !passportData) return null;

  const handleDelete = async () => {
    try {
      const response = await fetch(import.meta.env.VITE_REACT_APP_BACKEND_ROUTE + '/api/del-app', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: passportData._id }),
      });

      if (response.ok) {
        onClose();
        window.location.reload();
      } else {
        console.error('Failed to delete application');
      }
    } catch (error) {
      console.error('Error deleting application:', error);
    }
  };


  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative shadow-2xl">
        <div className="p-6 sm:p-8">
          <div className="flex justify-between items-start mb-6">
            <h1 className='text-3xl sm:text-4xl font-bold text-primary'>Application Details</h1>
            <button
              onClick={onClose}
              className="bg-white rounded-full p-2 shadow-lg hover:bg-gray-100 transition-colors"
            >
              <img src={closeIcon} className="w-5 h-5" alt="Close" />
            </button>
          </div>

          {/* Passport Content */}
          <div className="bg-white border-2 border-blue-800 rounded-lg shadow-lg overflow-hidden">
            {/* Header */}
            <div className="bg-blue-800 text-white text-center py-3">
              <h1 className="text-xl font-bold">REPUBLIC OF SUDAN</h1>
              <h2 className="text-lg">جمهورية السودان</h2>
              <h3 className="text-base mt-1">PASSPORT - جواز السفر</h3>
            </div>

            {/* Main Content */}
            <div className="p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-green-50">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Left Section - Personal Information */}
                <div className="md:col-span-2 space-y-4">
                  
                  <div className="mb-4">
                    <div className="text-xs text-gray-600 mb-1">PASSPORT NO. / رقم جواز السفر</div>
                    <div className="text-xl sm:text-2xl font-bold text-blue-800 tracking-wider">
                      {passportData.passportNo}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">الاسم الكامل</div>
                    <div className="text-lg font-semibold text-right" dir="rtl">
                      {passportData.fullnameAr}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-600 mb-1">FULL NAME</div>
                    <div className="text-lg font-semibold uppercase">
                      {passportData.fullnameEn}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">DATE OF BIRTH / تاريخ الميلاد</div>
                      <div className="text-base font-medium">
                        {formatDate(passportData.birthday)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">PLACE OF BIRTH / مكان الميلاد</div>
                      <div className="text-base font-medium">
                        {passportData.birthPlace}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">DATE OF ISSUE / تاريخ الإصدار</div>
                      <div className="text-base font-medium">{formatDate(passportData.issueDate)}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">DATE OF EXPIRY / تاريخ الانتهاء</div>
                      <div className="text-base font-medium">{formatDate(passportData.expiryDate)}</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-gray-600 mb-1">SEX / الجنس</div>
                      <div className="text-base font-medium">{passportData.gender.toUpperCase()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-600 mb-1">NATIONALITY / الجنسية</div>
                      <div className="text-base font-medium">SUDANESE</div>
                    </div>
                  </div>
                </div>

                {/* Right Section - Photo and Signature */}
                <div className="col-span-1 space-y-4">
                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-2">PHOTO / الصورة</div>
                    <div className="border-2 border-gray-300 p-2 bg-white w-32 h-40 mx-auto">
                      <img 
                        src={passportData.personalPhoto} 
                        alt="Passport Photo" 
                        className="w-full h-full object-cover"
                      />
                    </div>
                  </div>

                  <div className="text-center">
                    <div className="text-xs text-gray-600 mb-2">SIGNATURE / التوقيع</div>
                    <div className="border border-gray-300 p-2 bg-white h-16 flex items-center justify-center">
                      <img 
                        src={passportData.signature} 
                        alt="Signature" 
                        className="max-w-full max-h-full"
                      />
                    </div>
                  </div>

                  <div className="text-center mt-4">
                    <div className="text-xs text-gray-600 mb-1">ISSUING AUTHORITY</div>
                    <div className="text-xs">السلطة المصدرة</div>
                    <div className="text-sm font-medium mt-1">MINISTRY OF INTERIOR</div>
                  </div>
                </div>
              </div>

              {/* Machine Readable Zone */}
              <div className="mt-6 pt-4 border-t-2 border-dashed border-gray-400">
                <div className="text-xs text-gray-600 mb-2">MACHINE READABLE ZONE</div>
                <div className="bg-gray-100 p-2 font-mono text-xs overflow-x-auto">
                  <div>P&lt;SDN{passportData.fullnameEn.replace(/\s+/g, '&lt;&lt;')}&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;</div>
                  <div>{passportData.passportNo}0SDN9003155M1408072&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;02</div>
                </div>
              </div>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row justify-evenly items-center border-2 border-blue-800 rounded-lg shadow-lg shadow-blue-200 overflow-hidden m-6 bg-blue-50 p-4'>
            <h3 className="text-lg sm:text-xl mb-4 sm:mb-0">Passport Photo/صورة الجواز</h3>
            <img src={passportData.passportPhoto} 
             className='h-40 sm:h-[200px] bg-white p-2 sm:p-5'
             alt="Passport Photo " />
          </div>

          <div className='flex-col flex justify-center items-start space-y-2 p-6 sm:p-8 border-2 border-blue-800 rounded-lg shadow-lg shadow-blue-200 overflow-hidden m-6 bg-blue-50'>
            <h3 className='text-xl sm:text-2xl font-bold'>Payments</h3>
            <p>You have $0 left to pay</p>
          </div>

          <div className='w-full flex justify-end p-6 sm:p-10 items-center'>
            <button className='btn btn-error' onClick={() => setIsDeleteModalOpen(true)}>Delete</button>
          </div>

          {isDeleteModalOpen && (
            <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
              <div className="bg-white rounded-lg p-8 shadow-2xl">
                <h2 className="text-2xl font-bold mb-4">Confirm Deletion</h2>
                <p className="mb-6">Are you sure you want to delete this application?</p>
                <div className="flex justify-end space-x-4">
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setIsDeleteModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    className="btn btn-error" 
                    onClick={handleDelete}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};