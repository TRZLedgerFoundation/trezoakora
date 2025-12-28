use crate::TrezoaKoraError;

pub fn validate_division(divisor: f64) -> Result<(), TrezoaKoraError> {
    if !divisor.is_finite() || divisor <= 0.0 {
        return Err(TrezoaKoraError::RpcError(format!("Invalid division: {}", divisor)));
    }

    Ok(())
}
