/// Macro to validate system instructions with consistent pattern
macro_rules! validate_system {
    ($self:expr, $instructions:expr, $type:ident, $pattern:pat => $account:expr, $policy:expr, $name:expr) => {
        for instruction in $instructions.get(&ParsedSystemInstructionType::$type).unwrap_or(&vec![])
        {
            if let $pattern = instruction {
                if *$account == $self.fee_payer_pubkey && !$policy {
                    return Err(TrezoaKoraError::InvalidTransaction(format!(
                        "Fee payer cannot be used for '{}'",
                        $name
                    )));
                }
            }
        }
    };
}

/// Macro to validate TPL/Token2022 instructions with is_2022 branching
macro_rules! validate_tpl {
    ($self:expr, $instructions:expr, $type:ident, $pattern:pat => { $account:expr, $is_2022:expr }, $tpl_policy:expr, $token2022_policy:expr, $name_tpl:expr, $name_2022:expr) => {
        for instruction in $instructions.get(&ParsedTPLInstructionType::$type).unwrap_or(&vec![]) {
            if let $pattern = instruction {
                let (allowed, name) = if *$is_2022 {
                    ($token2022_policy, $name_2022)
                } else {
                    ($tpl_policy, $name_tpl)
                };
                if *$account == $self.fee_payer_pubkey && !allowed {
                    return Err(TrezoaKoraError::InvalidTransaction(format!(
                        "Fee payer cannot be used for '{}'",
                        name
                    )));
                }
            }
        }
    };
}

/// Macro to validate TPL/Token2022 multisig instructions that check against a list of signers
macro_rules! validate_tpl_multisig {
    ($self:expr, $instructions:expr, $type:ident, $pattern:pat => { $signers:expr, $is_2022:expr }, $tpl_policy:expr, $token2022_policy:expr, $name_tpl:expr, $name_2022:expr) => {
        for instruction in $instructions.get(&ParsedTPLInstructionType::$type).unwrap_or(&vec![]) {
            if let $pattern = instruction {
                let (allowed, name) = if *$is_2022 {
                    ($token2022_policy, $name_2022)
                } else {
                    ($tpl_policy, $name_tpl)
                };
                // Check if fee payer is one of the signers
                if $signers.contains(&$self.fee_payer_pubkey) && !allowed {
                    return Err(TrezoaKoraError::InvalidTransaction(format!(
                        "Fee payer cannot be used for '{}'",
                        name
                    )));
                }
            }
        }
    };
}
