
import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useUserStore } from "../data/userstore";



const ProtectedRoute = ({children} : {children : ReactNode}) => {
    const user = useUserStore((state) => state.userData?.user);
    console.log(user, "PROTECTED")
    if (user == undefined){
        return <Navigate to="/signin" replace/>
    }

  return (
    <>{children}</>
  )
}

export default ProtectedRoute