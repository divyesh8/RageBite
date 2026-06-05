import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

export default function ProtectedRoute({ children }) {
  const { isAuth, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#080808' }}>
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'16px' }}>
          <div style={{ width:'40px', height:'40px', border:'2px solid #FF3C1A', borderTopColor:'transparent', borderRadius:'50%', animation:'spin 0.6s linear infinite' }} />
          <p style={{ fontFamily:'monospace', fontSize:'11px', color:'#666', letterSpacing:'2px' }}>LOADING...</p>
        </div>
      </div>
    )
  }

  if (!isAuth) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return children
}