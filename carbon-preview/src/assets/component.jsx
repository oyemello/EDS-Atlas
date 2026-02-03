import {
    Button,
    DatePicker,
    DatePickerInput,
    ProgressBar,
} from '@carbon/react';
import { Add } from '@carbon/icons-react';

export default function SampleComponent2() {
    return (
        <div
            style={{
                width: 312,
                background: 'var(--cds-background)',
            }}
        >
            {/* Progress Bar Section */}
            <div
                style={{
                    padding: 'var(--cds-spacing-04)', // 12px
                }}
            >
                <ProgressBar
                    label="Progress bar"
                    value={0}
                    helperText="Optional helper text"
                />
            </div>

            {/* Calendar Section */}
            <div
                style={{
                    padding: 'var(--cds-spacing-04)', // 12px
                }}
            >
                <DatePicker datePickerType="single">
                    <DatePickerInput
                        id="date-picker"
                        labelText=""
                        placeholder="mm/dd/yyyy"
                    />
                </DatePicker>
            </div>

            {/* Button Section */}
            <div
                style={{
                    padding: 'var(--cds-spacing-04)', // 12px
                    alignItems: 'center',
                    justifyContent: 'center'
                }}
            >
                <Button renderIcon={Add}>
                    Button
                </Button>
            </div>
        </div>
    );
}
