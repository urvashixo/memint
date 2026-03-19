import { useState, useEffect, useCallback } from 'react'
import { useStoryProtocol, RoyaltyInfo } from '../hooks/useStoryProtocol'

interface RoyaltyPanelProps {
  ipId: string
  onClose?: () => void
}

export function RoyaltyPanel({ ipId, onClose }: RoyaltyPanelProps) {
  const { 
    getRoyaltyInfo, 
    claimRoyalties, 
    snapshotAndClaim,
    isLoadingRoyalties,
    isClaimingRoyalties,
    error: hookError,
    clearError,
  } = useStoryProtocol()
  
  const [royaltyInfo, setRoyaltyInfo] = useState<RoyaltyInfo | null>(null)
  const [localError, setLocalError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [hasFetched, setHasFetched] = useState(false)

  // Fetch royalty info only once on mount
  useEffect(() => {
    // Only fetch once
    if (hasFetched) return
    
    let isMounted = true
    
    const fetchRoyalties = async () => {
      console.log('Fetching royalty info for:', ipId)
      const info = await getRoyaltyInfo(ipId)
      if (isMounted) {
        setRoyaltyInfo(info)
        setHasFetched(true)
      }
    }
    
    fetchRoyalties()
    
    return () => {
      isMounted = false
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipId]) // Only depend on ipId, not getRoyaltyInfo

  // Manual refresh function
  const handleRefresh = useCallback(async () => {
    console.log('Manual refresh triggered')
    setSuccessMessage(null)
    setLocalError(null)
    const info = await getRoyaltyInfo(ipId)
    setRoyaltyInfo(info)
  }, [getRoyaltyInfo, ipId])

  const handleSnapshotAndClaim = useCallback(async () => {
    setLocalError(null)
    setSuccessMessage(null)
    clearError()
    
    console.log('Starting snapshot and claim for:', ipId)
    const result = await snapshotAndClaim(ipId)
    
    if (result) {
      if (result.success) {
        if (parseFloat(result.claimedAmount) > 0) {
          setSuccessMessage(`Successfully claimed ${result.claimedAmount} $IP!`)
        } else {
          setSuccessMessage('Snapshot completed. No funds to claim at this time.')
        }
      } else {
        setLocalError('No funds available to claim')
      }
      // Refresh royalty info after claiming
      const info = await getRoyaltyInfo(ipId)
      setRoyaltyInfo(info)
    } else {
      setLocalError('Failed to snapshot and claim')
    }
  }, [ipId, snapshotAndClaim, clearError, getRoyaltyInfo])

  const handleClaimOnly = useCallback(async () => {
    setLocalError(null)
    setSuccessMessage(null)
    clearError()
    
    console.log('Starting claim only for:', ipId)
    const txHash = await claimRoyalties(ipId)
    
    if (txHash) {
      setSuccessMessage(`Royalties claimed! TX: ${txHash.slice(0, 10)}...`)
      // Refresh royalty info after claiming
      const info = await getRoyaltyInfo(ipId)
      setRoyaltyInfo(info)
    } else {
      setLocalError('Failed to claim royalties')
    }
  }, [ipId, claimRoyalties, clearError, getRoyaltyInfo])

  const displayError = localError || hookError

  return (
    <div className="bg-gray-800 rounded-lg p-6 max-w-md w-full mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-xl font-bold text-white">Royalty Information</h3>
        <div className="flex gap-2">
          <button
            onClick={handleRefresh}
            disabled={isLoadingRoyalties}
            className="text-gray-400 hover:text-white p-1"
            title="Refresh"
          >
            
          </button>
          {onClose && (
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-xl"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Loading State */}
      {isLoadingRoyalties && !royaltyInfo && (
        <div className="text-center py-8">
          <div className="animate-spin text-4xl mb-2">⏳</div>
          <p className="text-gray-400">Loading royalty info...</p>
        </div>
      )}

      {/* Error State */}
      {displayError && (
        <div className="bg-red-900/50 border border-red-500 rounded-lg p-3 mb-4">
          <p className="text-red-300 text-sm">{displayError}</p>
          <button 
            onClick={() => { setLocalError(null); clearError(); }}
            className="text-red-400 text-xs underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-900/50 border border-green-500 rounded-lg p-3 mb-4">
          <p className="text-green-300 text-sm">{successMessage}</p>
          <button 
            onClick={() => setSuccessMessage(null)}
            className="text-green-400 text-xs underline mt-1"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Royalty Info Display */}
      {royaltyInfo && (
        <div className="space-y-4">
          {/* Vault Address */}
          {royaltyInfo.royaltyVaultAddress && (
            <div className="text-sm">
              <span className="text-gray-400">Vault: </span>
              <a 
                href={`https://aeneid.storyscan.xyz/address/${royaltyInfo.royaltyVaultAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:underline"
              >
                {royaltyInfo.royaltyVaultAddress.slice(0, 10)}...{royaltyInfo.royaltyVaultAddress.slice(-8)}
              </a>
            </div>
          )}

          {/* Balance Cards */}
          <div className="grid grid-cols-2 gap-3">
            {/* Vault Balance */}
            <div className="bg-purple-900/30 border border-purple-500/50 rounded-lg p-3">
              <p className="text-purple-300 text-xs mb-1"> Vault Balance</p>
              <p className="text-white text-lg font-bold">{royaltyInfo.vaultBalance} $IP</p>
            </div>

            {/* Claimable Now */}
            <div className="bg-green-900/30 border border-green-500/50 rounded-lg p-3">
              <p className="text-green-300 text-xs mb-1"> Claimable Now</p>
              <p className="text-white text-lg font-bold">{royaltyInfo.claimableAmount} $IP</p>
            </div>
          </div>

          {/* Unsnapshotted Warning */}
          {royaltyInfo.hasUnsnapshotedFunds && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-3">
              <p className="text-yellow-300 text-sm">
                ⚠️ <strong>{royaltyInfo.unsnapshotedAmount} $IP</strong> needs to be snapshotted before claiming
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-2 pt-2">
            {/* Snapshot & Claim - Show when there are unsnapshotted funds */}
            {royaltyInfo.hasUnsnapshotedFunds && (
              <button
                onClick={handleSnapshotAndClaim}
                disabled={isClaimingRoyalties}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isClaimingRoyalties ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Processing...
                  </span>
                ) : (
                  ` Snapshot & Claim ${royaltyInfo.vaultBalance} $IP`
                )}
              </button>
            )}

            {/* Claim Only - Show when funds are already claimable */}
            {parseFloat(royaltyInfo.claimableAmount) > 0 && !royaltyInfo.hasUnsnapshotedFunds && (
              <button
                onClick={handleClaimOnly}
                disabled={isClaimingRoyalties}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                {isClaimingRoyalties ? (
                  <span className="flex items-center justify-center gap-2">
                    <span className="animate-spin">⏳</span>
                    Claiming...
                  </span>
                ) : (
                  `💸 Claim ${royaltyInfo.claimableAmount} $IP`
                )}
              </button>
            )}

            {/* No Royalties Message */}
            {!royaltyInfo.hasRoyalties && (
              <div className="text-center py-4">
                <p className="text-gray-400">No royalties to claim yet</p>
                <p className="text-gray-500 text-sm mt-1">
                  Royalties will appear when others mint license tokens for this IP
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* No Vault State */}
      {!isLoadingRoyalties && !royaltyInfo && !displayError && (
        <div className="text-center py-8">
          <p className="text-gray-400">No royalty vault found for this IP</p>
          <p className="text-gray-500 text-sm mt-2">
            A royalty vault is created when someone mints a license token
          </p>
        </div>
      )}
    </div>
  )
}

export default RoyaltyPanel
