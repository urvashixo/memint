import { StoryClient, StoryConfig } from '@story-protocol/core-sdk'
import { useWalletClient, useAccount } from 'wagmi'
import { useState, useCallback } from 'react'
import { custom, Address, parseEther, createPublicClient, http } from 'viem'


// Story Aeneid testnet chain configuration for direct RPC calls
const storyAeneid = {
  id: 1315,
  name: 'Story Aeneid Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'IP',
    symbol: 'IP',
  },
  rpcUrls: {
    default: { http: ['https://aeneid.storyrpc.io'] },
  },
  blockExplorers: {
    default: { name: 'Story Explorer', url: 'https://aeneid.storyscan.xyz' },
  },
} as const

// Story Protocol NFT contract for IP registration (SPG)
const SPG_NFT_CONTRACT = '0xc32A8a0FF3beDDDa58393d022aF433e78739FAbc' as Address

// WIP Token address for license fees on Aeneid testnet
const WIP_TOKEN_ADDRESS = '0x1514000000000000000000000000000000000000' as Address

// Royalty Policy LAP (Liquid Absolute Percentage) address on Aeneid testnet
// Required when setting minting fees for commercial licenses
const ROYALTY_POLICY_LAP = '0xBe54FB168b3c982b7AaE60dB6CF75Bd8447b390E' as Address

// Pinata JWT from environment
const PINATA_JWT = import.meta.env.VITE_PINATA_JWT

// License type options for users to choose from
export type LicenseType = 'none' | 'open' | 'commercial' | 'commercial-remix'

export interface LicenseConfig {
  type: LicenseType
  label: string
  description: string
  commercialUse: boolean
  derivativesAllowed: boolean
  commercialRevShare?: number // percentage 0-100
  mintingFee?: string // in $IP tokens
}

export const LICENSE_OPTIONS: LicenseConfig[] = [
  {
    type: 'none',
    label: 'No License',
    description: 'Register IP without any license terms. You can add licenses later.',
    commercialUse: false,
    derivativesAllowed: false,
  },
  {
    type: 'open',
    label: 'Open Research (Non-Commercial)',
    description: 'Free for academic and research use. No commercial use allowed.',
    commercialUse: false,
    derivativesAllowed: true,
  },
  {
    type: 'commercial',
    label: 'Commercial Use',
    description: 'Allow commercial use. Others pay a fee to license your research.',
    commercialUse: true,
    derivativesAllowed: false,
    mintingFee: '1', // 1 $IP
  },
  {
    type: 'commercial-remix',
    label: 'Commercial Remix',
    description: 'Allow commercial use and derivatives with 5% revenue share.',
    commercialUse: true,
    derivativesAllowed: true,
    commercialRevShare: 5,
    mintingFee: '0.5', // 0.5 $IP
  },
]

export interface IPMetadata {
  title: string
  description: string
  ipType: string
  createdAt: string
  creator: string
  licenseType?: LicenseType // Optional license type
  fileUrl?: string // Optional permanent IPFS link to the report file
  reportFile?: File | Blob // Optional file to upload to IPFS for permanent storage
  attributes: Array<{ key: string; value: string }>
}

export interface RegisterIPResult {
  txHash: string
  ipId: string
  tokenId: string
  licenseTermsId?: string // The ID of the attached license terms (if any)
}

// Result from minting a license token
export interface MintLicenseResult {
  txHash: string
  licenseTokenIds: string[]
}

// Royalty information for an IP
export interface RoyaltyInfo {
  ipId: string
  claimableAmount: string // In WIP tokens (formatted)
  claimableAmountRaw: bigint
  vaultBalance: string // Total balance in the vault (formatted)
  vaultBalanceRaw: bigint
  unsnapshotedAmount: string // Funds in vault but not yet claimable
  totalCollected: string
  royaltyPolicy: string
  hasRoyalties: boolean
  hasUnsnapshotedFunds: boolean // True if there are funds that need snapshot
  royaltyVaultAddress?: string // Address of the IP's royalty vault (if exists)
}

// IP Asset details from Story Protocol API
export interface IPAssetDetails {
  ipId: string
  tokenId: string
  title: string
  description: string
  imageUrl: string
  creator: string
  createdAt: string
  licenseTermsIds: string[]
  hasLicense: boolean
}

export function useStoryProtocol() {
  const { data: walletClient } = useWalletClient()
  const { address } = useAccount()
  const [isRegistering, setIsRegistering] = useState(false)
  const [isMintingLicense, setIsMintingLicense] = useState(false)
  const [isClaimingRoyalties, setIsClaimingRoyalties] = useState(false)
  const [isLoadingRoyalties, setIsLoadingRoyalties] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const getStoryClient = useCallback(async (): Promise<StoryClient | null> => {
    if (!walletClient) {
      setError('Wallet not connected')
      return null
    }
    const config: StoryConfig = {
      account: walletClient.account,
      transport: custom(walletClient.transport),
      chainId: 'aeneid',
    }
    
    const client = StoryClient.newClient(config)
    return client
  }, [walletClient])

  // Hash content using SHA-256 (Story Protocol requirement)
  const hashContent = async (content: string | Uint8Array): Promise<`0x${string}`> => {
    const data = typeof content === 'string' ? new TextEncoder().encode(content) : content
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashArray = Array.from(new Uint8Array(hashBuffer))
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
    return `0x${hashHex}` as `0x${string}`
  }

  // Fetch image and compute SHA-256 hash of its bytes
  const getImageHash = useCallback(async (url: string): Promise<`0x${string}`> => {
    try {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const bytes = new Uint8Array(arrayBuffer)
      return await hashContent(bytes)
    } catch (err) {
      console.warn('Failed to fetch image for hashing, using URL hash instead:', err)
      return await hashContent(url)
    }
  }, [])

  // Upload binary file to Pinata (for report files)
  const uploadFileToPinata = async (file: File | Blob, name: string): Promise<string> => {
    const formData = new FormData()
    formData.append('file', file, name)
    formData.append('pinataMetadata', JSON.stringify({ name }))
    formData.append('pinataOptions', JSON.stringify({ cidVersion: 1 }))

    const response = await fetch('https://api.pinata.cloud/pinning/pinFileToIPFS', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: formData,
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`Pinata file upload failed: ${response.statusText} - ${errorText}`)
    }
    
    const result = await response.json()
    return result.IpfsHash
  }

  // Upload JSON to Pinata
  const uploadToPinata = async (data: object, name: string): Promise<string> => {
    const response = await fetch('https://api.pinata.cloud/pinning/pinJSONToIPFS', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${PINATA_JWT}`,
      },
      body: JSON.stringify({
        pinataContent: data,
        pinataMetadata: { name },
      }),
    })
    
    if (!response.ok) {
      throw new Error(`Pinata upload failed: ${response.statusText}`)
    }
    
    const result = await response.json()
    return result.IpfsHash
  }
  const uploadMetadataToIPFS = useCallback(async (metadata: IPMetadata): Promise<{ 
    ipMetadataURI: string
    ipMetadataHash: `0x${string}`
    nftMetadataURI: string
    nftMetadataHash: `0x${string}` 
  }> => {
    // Generate a unique, stable image URL for this IP
    const seed = Date.now()
    const imageUrl = `https://picsum.photos/seed/${seed}/400/400`
    
    // Convert ISO date string to Unix epoch (milliseconds) - REQUIRED by Story Protocol
    const createdAtEpoch = new Date(metadata.createdAt).getTime()
    
    // Fetch and hash the actual image bytes - REQUIRED by Story Protocol
    console.log('Fetching image for hash computation...')
    const imageHash = await getImageHash(imageUrl)
    console.log('Image hash computed:', imageHash)

    // If a report file is provided, upload it to IPFS for permanent storage
    let permanentFileUrl = metadata.fileUrl
    if (metadata.reportFile) {
      console.log('Uploading report file to IPFS...')
      const fileName = `${metadata.title.replace(/[^a-z0-9]/gi, '_')}_report`
      const fileIpfsHash = await uploadFileToPinata(metadata.reportFile, fileName)
      permanentFileUrl = `https://ipfs.io/ipfs/${fileIpfsHash}`
      console.log('Report file uploaded to IPFS:', permanentFileUrl)
    }
    
    // Create IP metadata following Story Protocol's IPA Metadata Standard
    // CRITICAL: createdAt must be Unix epoch (number), imageHash must be hash of image bytes
    const ipMetadata = {
      title: metadata.title,
      description: metadata.description,
      createdAt: createdAtEpoch.toString(), // Unix epoch as string
      image: imageUrl,
      imageHash: imageHash,
      creators: [
        {
          name: metadata.creator,
          address: address || '0x0000000000000000000000000000000000000000',
          contributionPercent: 100,
          description: 'Research Author',
        },
      ],      ipType: metadata.ipType || 'Research Report',
      media: [
        {
          name: `${metadata.title} - Cover Image`,
          url: imageUrl,
          mimeType: 'image/jpeg',
        },
        // Include the actual report file if uploaded to IPFS
        ...(permanentFileUrl ? [{
          name: `${metadata.title} - Document`,
          url: permanentFileUrl,
          mimeType: 'application/octet-stream', // Generic binary, works for docx/pdf/etc
        }] : []),
      ],
      // Add external_url to IP metadata as well for the report file
      ...(permanentFileUrl && { external_url: permanentFileUrl }),
      app: {
        id: 'medmint',
        name: 'MedMint Research',
        website: 'https://medmint.app',
      },
      tags: ['research', 'medical', 'science'],
    }    // Create NFT metadata following ERC-721 standard
    const nftMetadata = {
      name: metadata.title,
      description: metadata.description,
      image: imageUrl,
      external_url: permanentFileUrl || 'https://medmint.app', // Link to report file if available
      attributes: [
        { trait_type: 'IP Type', value: metadata.ipType || 'Research Report' },
        { trait_type: 'Creator', value: metadata.creator },
        { trait_type: 'Created At', value: metadata.createdAt },
        ...(permanentFileUrl ? [{ trait_type: 'Report File', value: permanentFileUrl }] : []),
        ...metadata.attributes.map((attr) => ({
          trait_type: attr.key,
          value: attr.value,
        })),
      ],
    }

    try {
      // IMPORTANT: Hash the metadata BEFORE uploading (as per Story Protocol docs)
      // The hash must match the exact JSON.stringify output
      const ipHash = await hashContent(JSON.stringify(ipMetadata))
      const nftHash = await hashContent(JSON.stringify(nftMetadata))

      // Upload IP metadata to IPFS via Pinata
      const ipIpfsHash = await uploadToPinata(ipMetadata, `ip-metadata-${metadata.title}`)
      
      // Upload NFT metadata to IPFS via Pinata  
      const nftIpfsHash = await uploadToPinata(nftMetadata, `nft-metadata-${metadata.title}`)

      // Use ipfs.io gateway URLs (as per Story Protocol docs)
      const ipMetadataURI = `https://ipfs.io/ipfs/${ipIpfsHash}`
      const nftMetadataURI = `https://ipfs.io/ipfs/${nftIpfsHash}`
      
      // Hash is already prefixed with 0x from hashContent
      const ipMetadataHash = ipHash
      const nftMetadataHash = nftHash

      console.log('=== IPFS Upload Complete ===')
      console.log('IP Metadata URI:', ipMetadataURI)
      console.log('IP Metadata Hash:', ipMetadataHash)
      console.log('NFT Metadata URI:', nftMetadataURI)
      console.log('NFT Metadata Hash:', nftMetadataHash)
      console.log('IP Metadata:', JSON.stringify(ipMetadata, null, 2))

      return {
        ipMetadataURI,
        ipMetadataHash,
        nftMetadataURI,
        nftMetadataHash,
      }
    } catch (uploadError) {
      console.error('Failed to upload to IPFS:', uploadError)
      throw uploadError
    }
  }, [address, getImageHash])

  const registerIP = useCallback(async (metadata: IPMetadata): Promise<RegisterIPResult | null> => {
    setIsRegistering(true)
    setError(null)

    try {
      const client = await getStoryClient()
      if (!client) {
        throw new Error('Failed to initialize Story Protocol client')
      }

      // Upload metadata to IPFS
      const { ipMetadataURI, ipMetadataHash, nftMetadataURI, nftMetadataHash } = await uploadMetadataToIPFS(metadata)
      
      console.log('=== Registering IP on Story Protocol ===')
      console.log('SPG Contract:', SPG_NFT_CONTRACT)
      console.log('IP Metadata URI:', ipMetadataURI)
      console.log('IP Metadata Hash:', ipMetadataHash)
      console.log('License Type from metadata:', metadata.licenseType || 'none')

      // Build license terms if a license type is selected
      const licenseTermsData = buildLicenseTerms(metadata.licenseType)
      
      console.log('License Terms Data:', licenseTermsData ? 'PRESENT' : 'UNDEFINED')
      if (licenseTermsData) {
        console.log('License Terms will be attached:', JSON.stringify(licenseTermsData, (_key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        , 2))
      } else {
        console.log('⚠️ No license terms will be attached to this IP')
      }

      // Build the registration request
      const registrationRequest = {
        nft: {
          type: 'mint' as const,
          spgNftContract: SPG_NFT_CONTRACT,
        },
        ipMetadata: {
          ipMetadataURI,
          ipMetadataHash,
          nftMetadataURI,
          nftMetadataHash,
        },
        ...(licenseTermsData && { licenseTermsData }),
      }
      
      console.log('Registration Request:', JSON.stringify(registrationRequest, (_key, value) => 
        typeof value === 'bigint' ? value.toString() : value
      , 2))

      // Register IP using registerIpAsset (as per Story Protocol docs)
      // This mints an NFT and registers it as an IP Asset in one transaction
      const response = await client.ipAsset.registerIpAsset(registrationRequest)

      console.log('=== IP Registration Successful ===')
      console.log('Transaction Hash:', response.txHash)
      console.log('IP Asset ID:', response.ipId)
      console.log('Token ID:', response.tokenId)
      console.log('Full Response:', response)
      console.log('View on Story Explorer:', `https://aeneid.explorer.story.foundation/ipa/${response.ipId}`)

      // Extract license terms ID from response (if any were attached)
      // The SDK returns licenseTermsIds as an array of bigints
      const licenseTermsIds = (response as { licenseTermsIds?: bigint[] }).licenseTermsIds
      const licenseTermsId = licenseTermsIds?.[0]?.toString()
      
      if (licenseTermsId) {
        console.log('License Terms ID:', licenseTermsId)
      }

      return {
        txHash: response.txHash || '',
        ipId: response.ipId || '',
        tokenId: response.tokenId?.toString() || '',
        licenseTermsId,
      }
    } catch (err: unknown) {
      console.error('Failed to register IP:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to register IP'
      setError(errorMessage)
      return null
    } finally {
      setIsRegistering(false)
    }
  }, [getStoryClient, uploadMetadataToIPFS])
  // Build license terms based on selected license type
  const buildLicenseTerms = (licenseType?: LicenseType) => {
    console.log('=== Building License Terms ===')
    console.log('License Type requested:', licenseType)
    
    if (!licenseType || licenseType === 'none') {
      console.log('No license terms needed (none selected)')
      return undefined
    }

    const licenseConfig = LICENSE_OPTIONS.find(l => l.type === licenseType)
    console.log('License Config found:', licenseConfig)
    
    if (!licenseConfig) {
      console.log('ERROR: License config not found!')
      return undefined
    }

    let terms;
    switch (licenseType) {
      case 'open':
        console.log('Building OPEN (non-commercial) license terms')
        console.log('Royalty Policy: ZERO ADDRESS (no royalties for non-commercial)')
        // Non-commercial, derivatives allowed
        terms = [{
          terms: {
            transferable: true,
            royaltyPolicy: '0x0000000000000000000000000000000000000000' as Address,
            defaultMintingFee: BigInt(0),
            expiration: BigInt(0),
            commercialUse: false,
            commercialAttribution: false,
            commercializerChecker: '0x0000000000000000000000000000000000000000' as Address,
            commercializerCheckerData: '0x' as `0x${string}`,
            commercialRevShare: 0,
            commercialRevCeiling: BigInt(0),
            derivativesAllowed: true,
            derivativesAttribution: true,
            derivativesApproval: false,
            derivativesReciprocal: true,
            derivativeRevCeiling: BigInt(0),
            currency: WIP_TOKEN_ADDRESS,
            uri: '',
          },
        }]
        break

      case 'commercial':
        console.log('Building COMMERCIAL license terms')
        console.log('Royalty Policy LAP:', ROYALTY_POLICY_LAP)
        console.log('Minting Fee:', licenseConfig.mintingFee || '1', '$IP')
        // Commercial use, no derivatives - requires royalty policy for minting fee
        terms = [{
          terms: {
            transferable: true,
            royaltyPolicy: ROYALTY_POLICY_LAP,
            defaultMintingFee: parseEther(licenseConfig.mintingFee || '1'),
            expiration: BigInt(0),
            commercialUse: true,
            commercialAttribution: true,
            commercializerChecker: '0x0000000000000000000000000000000000000000' as Address,
            commercializerCheckerData: '0x' as `0x${string}`,
            commercialRevShare: 0,
            commercialRevCeiling: BigInt(0),
            derivativesAllowed: false,
            derivativesAttribution: false,
            derivativesApproval: false,
            derivativesReciprocal: false,
            derivativeRevCeiling: BigInt(0),
            currency: WIP_TOKEN_ADDRESS,
            uri: '',
          },
        }]
        break

      case 'commercial-remix':
        console.log('Building COMMERCIAL-REMIX license terms')
        console.log('Royalty Policy LAP:', ROYALTY_POLICY_LAP)
        console.log('Minting Fee:', licenseConfig.mintingFee || '0.5', '$IP')
        console.log('Revenue Share:', licenseConfig.commercialRevShare || 5, '%')
        // Commercial use with derivatives and revenue share - requires royalty policy
        terms = [{
          terms: {
            transferable: true,
            royaltyPolicy: ROYALTY_POLICY_LAP,
            defaultMintingFee: parseEther(licenseConfig.mintingFee || '0.5'),
            expiration: BigInt(0),
            commercialUse: true,
            commercialAttribution: true,
            commercializerChecker: '0x0000000000000000000000000000000000000000' as Address,
            commercializerCheckerData: '0x' as `0x${string}`,
            commercialRevShare: licenseConfig.commercialRevShare || 5,
            commercialRevCeiling: BigInt(0),
            derivativesAllowed: true,
            derivativesAttribution: true,
            derivativesApproval: false,
            derivativesReciprocal: true,
            derivativeRevCeiling: BigInt(0),
            currency: WIP_TOKEN_ADDRESS,
            uri: '',
          },
        }]
        break

      default:
        console.log('Unknown license type:', licenseType)
        return undefined
    }
    
    console.log('=== License Terms Built ===')
    console.log('Terms object:', JSON.stringify(terms, (_key, value) => 
      typeof value === 'bigint' ? value.toString() : value
    , 2))
    return terms
  }

  // ==========================================
  // LICENSE TOKEN MINTING - Share IP with partners
  // ==========================================
  
  const mintLicenseToken = useCallback(async (
    ipId: string,
    licenseTermsId: string,
    receiverAddress: string,
    amount: number = 1
  ): Promise<MintLicenseResult | null> => {
    setIsMintingLicense(true)
    setError(null)

    try {
      const client = await getStoryClient()
      if (!client) {
        throw new Error('Failed to initialize Story Protocol client')
      }      console.log('=== Minting License Token ===')
      console.log('IP ID:', ipId)
      console.log('License Terms ID:', licenseTermsId)
      console.log('Receiver:', receiverAddress)
      console.log('Amount:', amount)

      const response = await client.license.mintLicenseTokens({
        licenseTermsId: licenseTermsId as unknown as bigint, // SDK expects bigint
        licensorIpId: ipId as Address,
        receiver: receiverAddress as Address,
        amount,
      })

      console.log('=== License Token Minted ===')
      console.log('Transaction Hash:', response.txHash)
      console.log('License Token IDs:', response.licenseTokenIds)

      return {
        txHash: response.txHash || '',
        licenseTokenIds: response.licenseTokenIds?.map(id => id.toString()) || [],
      }
    } catch (err: unknown) {
      console.error('Failed to mint license token:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to mint license token'
      setError(errorMessage)
      return null
    } finally {
      setIsMintingLicense(false)
    }
  }, [getStoryClient])
  // ==========================================
  // ROYALTY MANAGEMENT - View and claim royalties
  // ==========================================
  const getRoyaltyInfo = useCallback(async (ipId: string): Promise<RoyaltyInfo | null> => {
    setIsLoadingRoyalties(true)
    setError(null)

    try {
      const client = await getStoryClient()
      if (!client || !address) {
        throw new Error('Wallet not connected')
      }

      console.log('=== Fetching Royalty Info ===')
      console.log('IP ID:', ipId)
      console.log('Claimer:', address)

      // Get the royalty vault address using the SDK method
      let royaltyVaultAddress: string | undefined
      
      try {
        royaltyVaultAddress = await client.royalty.getRoyaltyVaultAddress(ipId as Address)
        console.log('Royalty Vault Address:', royaltyVaultAddress)
      } catch (vaultError) {
        console.log('Could not get royalty vault address:', vaultError)
      }

      // Check if vault exists (non-zero address means vault exists)
      const hasVault = royaltyVaultAddress && royaltyVaultAddress !== '0x0000000000000000000000000000000000000000'
      
      if (!hasVault) {
        console.log('This IP does not have a royalty vault')
        console.log('Possible reasons:')
        console.log('  1. IP was registered without a commercial license')
        console.log('  2. IP was registered with "Open Research" (non-commercial)')
        console.log('  3. Royalty vault is created lazily on first license mint')
        return {
          ipId,
          claimableAmount: '0',
          claimableAmountRaw: BigInt(0),
          vaultBalance: '0',
          vaultBalanceRaw: BigInt(0),
          unsnapshotedAmount: '0',
          totalCollected: '0',
          royaltyPolicy: 'None - IP has no royalty vault (non-commercial or vault not yet created)',
          hasRoyalties: false,
          hasUnsnapshotedFunds: false,
        }
      }

      console.log('✅ Royalty Vault found:', royaltyVaultAddress)

      // Create public client to read vault's token balance
      const publicClient = createPublicClient({
        chain: storyAeneid,
        transport: http(),
      })

      // Check WIP token balance OF THE VAULT
      let vaultBalance = '0'
      let vaultBalanceRaw = BigInt(0)
      try {
        vaultBalanceRaw = await publicClient.readContract({
          address: WIP_TOKEN_ADDRESS,
          abi: [{
            name: 'balanceOf',
            type: 'function',
            stateMutability: 'view',
            inputs: [{ name: 'account', type: 'address' }],
            outputs: [{ name: '', type: 'uint256' }],
          }],
          functionName: 'balanceOf',
          args: [royaltyVaultAddress as Address],
        })
        vaultBalance = (Number(vaultBalanceRaw) / 1e18).toFixed(4)
        console.log('💰 Vault WIP Balance:', vaultBalance, '$IP')
      } catch (balanceError) {
        console.log('Could not fetch vault balance:', balanceError)
      }

      // Get claimable revenue using SDK
      try {
        const claimableRevenue = await client.royalty.claimableRevenue({
          ipId: ipId as Address,
          claimer: address,
          token: WIP_TOKEN_ADDRESS,
        })

        // Format the amount (WIP has 18 decimals like ETH)
        const claimableAmountRaw = claimableRevenue || BigInt(0)
        const claimableFormatted = (Number(claimableAmountRaw) / 1e18).toFixed(4)

        console.log('📊 Claimable by you:', claimableFormatted, '$IP')
        
        // Show the difference (unsnapshotted funds)
        const difference = parseFloat(vaultBalance) - parseFloat(claimableFormatted)
        const unsnapshotedAmount = difference.toFixed(4)
        const hasUnsnapshotedFunds = difference > 0
        if (hasUnsnapshotedFunds) {
          console.log('⚠️ Unsnapshotted funds:', unsnapshotedAmount, '$IP (call snapshotAndClaim to claim these)')
        }

        return {
          ipId,
          claimableAmount: claimableFormatted,
          claimableAmountRaw,
          vaultBalance,
          vaultBalanceRaw,
          unsnapshotedAmount,
          totalCollected: vaultBalance, // Use vault balance as total collected
          royaltyPolicy: ROYALTY_POLICY_LAP,
          hasRoyalties: claimableAmountRaw > BigInt(0) || parseFloat(vaultBalance) > 0,
          hasUnsnapshotedFunds,
          royaltyVaultAddress,
        }
      } catch (royaltyError: unknown) {
        console.log('Error getting claimable revenue:', royaltyError)
        // Even if claimable fails, we have a vault, so return info
        return {
          ipId,
          claimableAmount: '0',
          claimableAmountRaw: BigInt(0),
          vaultBalance,
          vaultBalanceRaw,
          unsnapshotedAmount: '0',
          totalCollected: vaultBalance,
          royaltyPolicy: ROYALTY_POLICY_LAP,
          hasRoyalties: parseFloat(vaultBalance) > 0,
          hasUnsnapshotedFunds: false,
          royaltyVaultAddress,
        }
      }
    } catch (err: unknown) {
      console.error('Failed to fetch royalty info:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch royalty info'
      setError(errorMessage)
      return null
    } finally {
      setIsLoadingRoyalties(false)
    }
  }, [getStoryClient, address])

  const claimRoyalties = useCallback(async (ipId: string): Promise<string | null> => {
    setIsClaimingRoyalties(true)
    setError(null)

    try {
      const client = await getStoryClient()
      if (!client || !address) {
        throw new Error('Wallet not connected')
      }

      console.log('=== Claiming Royalties ===')
      console.log('IP ID:', ipId)
      console.log('Claimer:', address)      // Claim all revenue for this IP
      const response = await client.royalty.claimAllRevenue({
        ancestorIpId: ipId as Address,
        claimer: address,
        childIpIds: [],
        royaltyPolicies: [ROYALTY_POLICY_LAP],
        currencyTokens: [WIP_TOKEN_ADDRESS],
      })

      console.log('=== Royalties Claimed ===')
      console.log('Transaction Hashes:', response.txHashes)
      console.log('Claimed Tokens:', response.claimedTokens)

      return response.txHashes?.[0] || ''
    } catch (err: unknown) {
      console.error('Failed to claim royalties:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to claim royalties'
      setError(errorMessage)
      return null
    } finally {
      setIsClaimingRoyalties(false)
    }
  }, [getStoryClient, address])

  // ==========================================
  // DEBUG: Check vault balance vs claimable
  // ==========================================
  const getVaultBalance = useCallback(async (ipId: string): Promise<{
    vaultAddress: string
    vaultBalance: string
    claimableAmount: string
  } | null> => {
    try {
      const client = await getStoryClient()
      if (!client || !address) {
        throw new Error('Wallet not connected')
      }

      // Get vault address
      const vaultAddress = await client.royalty.getRoyaltyVaultAddress(ipId as Address)
      console.log('=== Vault Debug ===')
      console.log('Vault Address:', vaultAddress)

      if (vaultAddress === '0x0000000000000000000000000000000000000000') {
        return { vaultAddress, vaultBalance: '0', claimableAmount: '0' }
      }

      // Create public client to read vault's token balance
      const publicClient = createPublicClient({
        chain: storyAeneid,
        transport: http(),
      })

      // Check WIP token balance OF THE VAULT
      const vaultBalanceRaw = await publicClient.readContract({
        address: WIP_TOKEN_ADDRESS,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        }],
        functionName: 'balanceOf',
        args: [vaultAddress as Address],
      })

      // Check claimable amount for the IP owner
      const claimableRaw = await client.royalty.claimableRevenue({
        ipId: ipId as Address,
        claimer: address,
        token: WIP_TOKEN_ADDRESS,
      })

      const vaultBalance = (Number(vaultBalanceRaw) / 1e18).toFixed(4)
      const claimableAmount = (Number(claimableRaw) / 1e18).toFixed(4)

      console.log('Vault WIP Balance:', vaultBalance, '$IP')
      console.log('Claimable by you:', claimableAmount, '$IP')
      console.log('Difference (unsnapshotted):', (Number(vaultBalanceRaw) - Number(claimableRaw)) / 1e18, '$IP')

      return {
        vaultAddress,
        vaultBalance,
        claimableAmount,
      }
    } catch (err) {
      console.error('Failed to get vault balance:', err)
      return null
    }
  }, [getStoryClient, address])

  // ==========================================
  // SNAPSHOT VAULT - Make funds claimable
  // ==========================================
  const snapshotVault = useCallback(async (ipId: string): Promise<string | null> => {
    try {
      const client = await getStoryClient()
      if (!client || !address) {
        throw new Error('Wallet not connected')
      }

      console.log('=== Snapshotting Vault ===')
      console.log('IP ID:', ipId)

      // Get vault address
      const vaultAddress = await client.royalty.getRoyaltyVaultAddress(ipId as Address)
      
      if (vaultAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('No royalty vault exists for this IP')
      }

      // Create wallet client to send transaction
      const publicClient = createPublicClient({
        chain: storyAeneid,
        transport: http(),
      })

      // Call snapshot() on the royalty vault to make funds claimable
      // The vault contract has a snapshot() function
      const { request } = await publicClient.simulateContract({
        address: vaultAddress as Address,
        abi: [{
          name: 'snapshot',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
        }],
        functionName: 'snapshot',
        account: address,
      })

      // Note: This requires the wallet to sign - you may need to use walletClient
      console.log('Snapshot simulation successful, request:', request)
      
      // For actual execution, use claimAllRevenue which handles snapshot internally
      const response = await client.royalty.claimAllRevenue({
        ancestorIpId: ipId as Address,
        claimer: address,
        childIpIds: [],
        royaltyPolicies: [ROYALTY_POLICY_LAP],
        currencyTokens: [WIP_TOKEN_ADDRESS],
      })

      console.log('=== Snapshot & Claim Complete ===')
      console.log('Transaction Hashes:', response.txHashes)
      console.log('Claimed Tokens:', response.claimedTokens)

      return response.txHashes?.[0] || ''
    } catch (err) {
      console.error('Failed to snapshot vault:', err)
      return null
    }
  }, [getStoryClient, address])

  // ==========================================
  // SNAPSHOT AND CLAIM - Properly snapshot then claim
  // ==========================================
  const snapshotAndClaim = useCallback(async (ipId: string): Promise<{
    snapshotTxHash: string
    claimTxHash?: string
    claimedAmount: string
    success: boolean
  } | null> => {
    setIsClaimingRoyalties(true)
    setError(null)

    try {
      const client = await getStoryClient()
      if (!client || !address || !walletClient) {
        throw new Error('Wallet not connected')
      }

      // Get vault address
      const vaultAddress = await client.royalty.getRoyaltyVaultAddress(ipId as Address)
      console.log('=== Snapshot and Claim ===')
      console.log('Vault Address:', vaultAddress)

      if (vaultAddress === '0x0000000000000000000000000000000000000000') {
        throw new Error('No royalty vault exists')
      }

      // Check vault balance before snapshot
      const publicClient = createPublicClient({
        chain: storyAeneid,
        transport: http(),
      })

      const vaultBalanceBefore = await publicClient.readContract({
        address: WIP_TOKEN_ADDRESS,
        abi: [{
          name: 'balanceOf',
          type: 'function',
          stateMutability: 'view',
          inputs: [{ name: 'account', type: 'address' }],
          outputs: [{ name: '', type: 'uint256' }],
        }],
        functionName: 'balanceOf',
        args: [vaultAddress as Address],
      }) as bigint

      console.log('Vault balance before:', (Number(vaultBalanceBefore) / 1e18).toFixed(4), '$IP')

      if (vaultBalanceBefore === BigInt(0)) {
        console.log('Vault is empty, nothing to claim')
        return {
          snapshotTxHash: '',
          claimedAmount: '0',
          success: false,
        }
      }

      // Step 1: Call snapshot() on the vault using walletClient
      console.log('Step 1: Taking snapshot...')
      const snapshotTxHash = await walletClient.writeContract({
        address: vaultAddress as Address,
        abi: [{
          name: 'snapshot',
          type: 'function',
          stateMutability: 'nonpayable',
          inputs: [],
          outputs: [{ name: '', type: 'uint256' }],
        }],
        functionName: 'snapshot',
      })
      console.log('Snapshot TX:', snapshotTxHash)

      // Wait for confirmation
      await publicClient.waitForTransactionReceipt({ hash: snapshotTxHash })
      console.log('Snapshot confirmed!')

      // Step 2: Check claimable after snapshot
      const claimableAfter = await client.royalty.claimableRevenue({
        ipId: ipId as Address,
        claimer: address,
        token: WIP_TOKEN_ADDRESS,
      })
      const claimableFormatted = (Number(claimableAfter) / 1e18).toFixed(4)
      console.log('Claimable after snapshot:', claimableFormatted, '$IP')

      if (claimableAfter === BigInt(0)) {
        console.log('Nothing claimable after snapshot - funds may have already been claimed')
        return {
          snapshotTxHash,
          claimedAmount: '0',
          success: true,
        }
      }

      // Step 3: Claim the revenue
      console.log('Step 2: Claiming revenue...')
      const claimResponse = await client.royalty.claimAllRevenue({
        ancestorIpId: ipId as Address,
        claimer: address,
        childIpIds: [],
        royaltyPolicies: [ROYALTY_POLICY_LAP],
        currencyTokens: [WIP_TOKEN_ADDRESS],
      })

      console.log('=== Claim Complete ===')
      console.log('Claim TX:', claimResponse.txHashes)
      console.log('Claimed Tokens:', claimResponse.claimedTokens)

      return {
        snapshotTxHash,
        claimTxHash: claimResponse.txHashes?.[0],
        claimedAmount: claimableFormatted,
        success: true,
      }
    } catch (err: unknown) {
      console.error('Failed to snapshot and claim:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to snapshot and claim'
      setError(errorMessage)
      return null
    } finally {
      setIsClaimingRoyalties(false)
    }
  }, [getStoryClient, address, walletClient])

  // ==========================================
  // IP ASSET DETAILS - Fetch from Story API
  // ==========================================

  const getIPDetails = useCallback(async (ipId: string): Promise<IPAssetDetails | null> => {
    try {
      console.log('=== Fetching IP Details ===')
      console.log('IP ID:', ipId)

      // Query Story Protocol API for IP asset details
      const response = await fetch(
        `https://api.story.foundation/api/v3/assets/${ipId}?chainId=aeneid`,
        {
          headers: {
            'Accept': 'application/json',
          },
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch IP details: ${response.statusText}`)
      }

      const data = await response.json()
      console.log('IP Asset Data:', data)

      // Extract relevant fields from the API response
      const asset = data.data || data

      return {
        ipId: asset.id || ipId,
        tokenId: asset.tokenId?.toString() || '',
        title: asset.metadata?.title || asset.name || 'Untitled',
        description: asset.metadata?.description || '',
        imageUrl: asset.metadata?.image || '',
        creator: asset.metadata?.creators?.[0]?.name || '',
        createdAt: asset.metadata?.createdAt || asset.blockTimestamp || '',
        licenseTermsIds: asset.licenseTermsIds?.map((id: unknown) => String(id)) || [],
        hasLicense: (asset.licenseTermsIds?.length || 0) > 0,
      }
    } catch (err: unknown) {
      console.error('Failed to fetch IP details:', err)
      return null
    }
  }, [])

  // Get license terms for an IP
  const getLicenseTerms = useCallback(async (ipId: string): Promise<{ id: string; terms: LicenseConfig }[] | null> => {
    try {
      const details = await getIPDetails(ipId)
      if (!details || !details.licenseTermsIds.length) {
        return []
      }

      // For now, return the license terms IDs
      // In a full implementation, you'd query each license terms ID for its details
      return details.licenseTermsIds.map(id => ({
        id,
        terms: LICENSE_OPTIONS[0], // Placeholder - would need to decode from chain
      }))
    } catch (err) {
      console.error('Failed to get license terms:', err)
      return null
    }
  }, [getIPDetails])

  return {
    // Registration
    registerIP,
    isRegistering,
    
    // License Token Minting
    mintLicenseToken,
    isMintingLicense,
    
    // Royalty Management
    getRoyaltyInfo,
    claimRoyalties,
    getVaultBalance,
    snapshotVault,
    snapshotAndClaim,
    isLoadingRoyalties,
    isClaimingRoyalties,
    
    // IP Details
    getIPDetails,
    getLicenseTerms,
    
    // Common
    error,
    clearError: () => setError(null),
    licenseOptions: LICENSE_OPTIONS,
  }
}
