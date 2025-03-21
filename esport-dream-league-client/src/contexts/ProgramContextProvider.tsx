'use client';

import { FC, ReactNode, createContext, useContext, useMemo, useCallback } from 'react';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { AnchorProvider, Program } from '@project-serum/anchor';
import { PublicKey } from '@solana/web3.js';
import { IDL } from '../types/esports-manager';
import { solanaConnection } from '@/services/connection-service';

// Program ID from your deployed contract
export const PROGRAM_ID = new PublicKey("2KBakNVa6xLxp6uQsgHhikrknw1pkjkS2f6ZGKtV5BzZ");

// Helper functions to find PDAs (unchanged)
export const findPlayerPDA = (mintPublicKey: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('player'), mintPublicKey.toBuffer()],
    PROGRAM_ID
  );
};

export const findTeamPDA = (ownerPublicKey: PublicKey, teamName: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('team'), ownerPublicKey.toBuffer(), Buffer.from(teamName)],
    PROGRAM_ID
  );
};

export const findCreatorPDA = (authorityPublicKey: PublicKey) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('creator'), authorityPublicKey.toBuffer()],
    PROGRAM_ID
  );
};

export const findTournamentPDA = (authorityPublicKey: PublicKey, tournamentName: string) => {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('tournament'), authorityPublicKey.toBuffer(), Buffer.from(tournamentName)],
    PROGRAM_ID
  );
};

// Create Program Context
type ProgramContextType = {
  program: Program<any> | null;
  provider: AnchorProvider | null;
  isConnected: boolean;
  clearCache: () => void;
  switchEndpoint: () => void;
};

const ProgramContext = createContext<ProgramContextType>({
  program: null,
  provider: null,
  isConnected: false,
  clearCache: () => {},
  switchEndpoint: () => {},
});

export const useProgram = () => useContext(ProgramContext);

// Program Provider Component
interface ProgramProviderProps {
  children: ReactNode;
}

export const ProgramProvider: FC<ProgramProviderProps> = ({ children }) => {
  const wallet = useAnchorWallet();
  
  // Create stable callback functions
  const clearCache = useCallback(() => {
    solanaConnection.clearCache();
  }, []);
  
  const switchEndpoint = useCallback(() => {
    solanaConnection.switchEndpoint();
  }, []);
  
  // Create program and provider with proper error handling
  const { program, provider, isConnected } = useMemo(() => {
    if (!wallet) {
      return {
        program: null,
        provider: null,
        isConnected: false,
      };
    }
  
    try {
      // Get the connection from the service
      const connection = solanaConnection.getConnection();
      
      // Create the provider with consistent commitment settings
      const provider = new AnchorProvider(
        connection,
        wallet,
        { 
          preflightCommitment: 'confirmed',  // Match the connection's commitment
          commitment: 'confirmed'
        }
      );
  
      // Create the program
      const program = new Program(
        IDL,
        PROGRAM_ID,
        provider
      );
  
      return {
        program,
        provider,
        isConnected: true,
      };
    } catch (error) {
      console.error("Error creating Anchor program:", error);
      return {
        program: null,
        provider: null,
        isConnected: false,
      };
    }
  }, [wallet]);
  
  // Create a stable context value object
  const contextValue = useMemo(() => ({
    program,
    provider,
    isConnected,
    clearCache,
    switchEndpoint
  }), [program, provider, isConnected, clearCache, switchEndpoint]);

  return (
    <ProgramContext.Provider value={contextValue}>
      {children}
    </ProgramContext.Provider>
  );
};