import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import { CONFIG_DIR } from '@/server_constants'

export const runtime = 'nodejs'

const PATTERNS_CSV = path.join(CONFIG_DIR, 'patterns.csv')

export async function GET() {
    const baseTypes = ['ORG', 'LOC', 'PER', 'DAT']
    try {
        if (!fs.existsSync(PATTERNS_CSV)) {
            return NextResponse.json(baseTypes)
        }

        const raw = fs.readFileSync(PATTERNS_CSV, 'utf8').toString().trim()
        if (!raw) return NextResponse.json(baseTypes)

        const lines = raw.split('\n').slice(1)
        for (const line of lines) {
            if (!line) continue
            const parts = line.split('\t')
            if (parts.length < 2) continue
            try {
                const label = JSON.parse(parts[1])
                if (typeof label === 'string' && !baseTypes.includes(label)) {
                    baseTypes.push(label)
                }
            } catch (e) {
                console.warn('Skipping malformed patterns.csv line:', line)
            }
        }

        return NextResponse.json(baseTypes)
    } catch (err) {
        console.error('Error reading patterns.csv:', err)
        return NextResponse.json({ error: 'Failed to read types' }, { status: 500 })
    }
}
