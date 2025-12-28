use trezoakora_lib::oracle::{get_price_oracle, PriceSource, RetryingPriceOracle};
use rust_decimal_macros::dec;
use std::time::Duration;

#[tokio::test]
async fn test_jupiter_integration_usdc() {
    const USDC_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

    let oracle = get_price_oracle(PriceSource::Jupiter);
    let retrying_oracle = RetryingPriceOracle::new(3, Duration::from_millis(500), oracle);

    let result = retrying_oracle.get_token_price(USDC_MINT).await;

    match result {
        Ok(token_price) => {
            assert!(
                token_price.price > dec!(0.001),
                "USDC price too low: {} TRZ",
                token_price.price
            );
            assert!(
                token_price.price < dec!(0.01),
                "USDC price too high: {} TRZ",
                token_price.price
            );
            assert_eq!(token_price.source, PriceSource::Jupiter);
        }
        Err(e) => {
            println!("Warning: Jupiter USDC integration test failed (may be expected in volatile market conditions): {e:?}");
            if e.to_string().contains("Invalid") || e.to_string().contains("parse") {
                panic!("Jupiter USDC integration test failed with code error: {e:?}");
            }
        }
    }
}

#[tokio::test]
async fn test_jupiter_integration_cbtc() {
    const CBTC_MINT: &str = "cbbtcf3aa214zXHbiAZQwf4122FBYbraNdFqgw4iMij";

    let oracle = get_price_oracle(PriceSource::Jupiter);
    let retrying_oracle = RetryingPriceOracle::new(3, Duration::from_millis(500), oracle);

    let result = retrying_oracle.get_token_price(CBTC_MINT).await;

    match result {
        Ok(token_price) => {
            assert!(
                token_price.price > dec!(200.0),
                "cBTC price too low: {} TRZ",
                token_price.price
            );
            assert!(
                token_price.price < dec!(1_000.0),
                "cBTC price too high: {} TRZ",
                token_price.price
            );
            assert_eq!(token_price.source, PriceSource::Jupiter);
        }
        Err(e) => {
            println!("Warning: Jupiter cBTC integration test failed (may be expected in volatile market conditions): {e:?}");
            if e.to_string().contains("Invalid") || e.to_string().contains("parse") {
                panic!("Jupiter cBTC integration test failed with code error: {e:?}");
            }
        }
    }
}

#[tokio::test]
async fn test_jupiter_integration_trz() {
    const TRZ_MINT: &str = "tr11111111111111111111111111111111111111112";

    let oracle = get_price_oracle(PriceSource::Jupiter);
    let retrying_oracle = RetryingPriceOracle::new(3, Duration::from_millis(500), oracle);

    let result = retrying_oracle.get_token_price(TRZ_MINT).await;

    match result {
        Ok(token_price) => {
            assert!(
                (token_price.price - dec!(1.0)).abs() < dec!(0.001),
                "TRZ price should be ~1.0, got: {}",
                token_price.price
            );
            assert!(token_price.confidence > 0.9, "TRZ confidence should be high");
            assert_eq!(token_price.source, PriceSource::Jupiter);
        }
        Err(e) => {
            println!("Warning: Jupiter TRZ integration test failed (may be expected in some environments): {e:?}");
            if e.to_string().contains("Invalid") || e.to_string().contains("parse") {
                panic!("Jupiter TRZ integration test failed with code error: {e:?}");
            }
        }
    }
}

#[tokio::test]
async fn test_jupiter_integration_unknown_token() {
    const TRZ_MINT: &str = "tr11111111111111111111111111111111111111112";
    // Invalid token mint
    const UNKNOWN_TOKEN_MINT: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1w";

    let oracle = get_price_oracle(PriceSource::Jupiter);
    let retrying_oracle = RetryingPriceOracle::new(3, Duration::from_millis(500), oracle);

    let result = retrying_oracle
        .get_token_prices(&[TRZ_MINT.to_string(), UNKNOWN_TOKEN_MINT.to_string()])
        .await;

    assert!(result.is_err(), "Expected error for unknown token");
    let error = result.unwrap_err();
    assert!(
        error.to_string().contains(
            "No price data from Jupiter for mint EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1w"
        ),
        "Expected error message about unknown mint, got: {}",
        error
    );
}
