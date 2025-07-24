import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const API_URL = 'http://localhost:8082/place_bid'

  // Transform the request body to use 'vuln', 'dealer', and 'auction' as expected by backend
  const { vulnerability, dealer, biddingHistory, ...rest } = req.body
  let vuln = vulnerability
  if (vulnerability === 'NS') vuln = 'N-S'
  if (vulnerability === 'EW') vuln = 'E-W'
  // If 'Both' or 'None', keep as is

  // Map dealer index to string as expected by backend
  const dealerMap = ['N', 'E', 'S', 'W']
  let dealerStr = dealer
  if (typeof dealer === 'number') {
    dealerStr = dealerMap[dealer]
  }

  // Map biddingHistory to auction
  const payload = { ...rest, vuln, dealer: dealerStr, auction: biddingHistory }

  try {
    const apiRes = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    })

    const data = await apiRes.json()
    res.status(apiRes.status).json(data)
  } catch (error) {
    res.status(500).json({ error: 'Failed to call infobridge/lia API', details: String(error) })
  }
}
