import { useCallback, useEffect, useState } from 'react';
import { formatUnits, type Address } from 'viem';
import { useReadContract } from 'wagmi';
import { erc20ABI } from '../../lib/contract/abis/erc20';
import { formatAddress } from '../../utils/messageFormatter';

export function TokenBalanceChecker() {
    const [inputAddress, setInputAddress] = useState<string>('');
    const [queryAddress, setQueryAddress] = useState<Address | null>(null);
    const [decimals, setDecimals] = useState<number>(18);

    const contractAddress = '0x0000000000000000000000000000000000000000';
    const hasContractAddress = Boolean(contractAddress);
    const hasQueryAddress = Boolean(queryAddress);

    const { data: decimalsData } = useReadContract({
        address: contractAddress,
        abi: erc20ABI,
        functionName: 'decimals',
        query: {
            enabled: hasContractAddress,
        },
    });

    const balanceQueryEnabled = hasContractAddress && hasQueryAddress && queryAddress !== null;

    const {
        data: balanceData,
        isLoading: isBalanceLoading,
        error: balanceError,
    } = useReadContract({
        address: contractAddress,
        abi: erc20ABI,
        functionName: 'balanceOf',
        ...(queryAddress && { args: [queryAddress] }),
        query: {
            enabled: balanceQueryEnabled,
        },
    });

    useEffect(() => {
        if (decimalsData !== undefined && typeof decimalsData === 'number') {
            setDecimals(decimalsData);
        }
    }, [decimalsData]);

    const handleCheckBalance = useCallback(() => {
        if (!inputAddress.trim()) {
            alert('주소를 입력해주세요.');
            return;
        }

        if (!/^0x[a-fA-F0-9]{40}$/.test(inputAddress.trim())) {
            alert('올바른 이더리움 주소 형식이 아닙니다.');
            return;
        }

        setQueryAddress(inputAddress.trim() as Address);
    }, [inputAddress]);

    const balance = balanceData && typeof balanceData === 'bigint'
        ? formatUnits(balanceData, decimals)
        : null;

    return (
        <div className="squid-token-balance-checker" style={{ marginTop: '12px', padding: '12px', border: '1px solid #333', borderRadius: '4px' }}>
            <div style={{ fontSize: '10px', marginBottom: '8px', fontWeight: 'bold' }}>
                TOKEN BALANCE CHECKER
            </div>

            <div style={{ display: 'flex', gap: '4px', marginBottom: '8px' }}>
                <input
                    type="text"
                    value={inputAddress}
                    onChange={(e) => setInputAddress(e.target.value)}
                    placeholder="0x..."
                    style={{
                        flex: 1,
                        padding: '6px 8px',
                        fontSize: '10px',
                        backgroundColor: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '2px',
                        color: '#fff',
                    }}
                    onKeyPress={(e) => {
                        if (e.key === 'Enter') {
                            handleCheckBalance();
                        }
                    }}
                />
            </div>

            {balanceError && (
                <div className="squid-tx-error" style={{ marginTop: '8px', fontSize: '9px' }}>
                    {balanceError.message || '잔액 조회 실패'}
                </div>
            )}

            {balance !== null && !isBalanceLoading && (
                <div style={{ marginTop: '8px', fontSize: '11px', color: '#4ade80', fontWeight: 'bold' }}>
                    Balance: {parseFloat(balance).toLocaleString()} tokens
                </div>
            )}

            {queryAddress && (
                <div style={{ marginTop: '4px', fontSize: '9px', color: '#888' }}>
                    Address: {formatAddress(queryAddress)}
                </div>
            )}
        </div>
    );
}
