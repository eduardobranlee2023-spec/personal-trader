UPDATE trades
SET status = CASE
    WHEN result_amount > 0 THEN 'ganada'
    WHEN result_amount < 0 THEN 'perdida'
    WHEN result_amount = 0 THEN 'breakeven'
    ELSE status
END
WHERE result_amount IS NOT NULL;
