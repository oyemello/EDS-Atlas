import {
    Button,
    ProgressBar,
    DatePicker,
    DatePickerInput,
} from '@carbon/react';
import { Add } from '@carbon/icons-react';
import '../demo-comp-2.scss';

export function DemoComp2() {
    return (
        <div className="demo-comp-2">
            {/* Progress section */}
            <div className="demo-comp-2__progress">
                <ProgressBar
                    label="Progress bar"
                    helperText="Optional helper text"
                    value={60}
                />
            </div>

            {/* Calendar section */}
            <div className="demo-comp-2__calendar">
                <DatePicker
                    datePickerType="single"
                    value="03/13/2021"
                >
                    <DatePickerInput
                        id="date-picker-input"
                        labelText=""
                        placeholder="mm/dd/yyyy"
                        hideLabel
                    />
                </DatePicker>
            </div>

            {/* Action */}
            <div className="demo-comp-2__action" style={{ display: 'flex', justifyContent: 'center' }}> {/*only edited code.*/}
                <Button
                    kind="primary"
                    renderIcon={Add}
                    iconDescription="Add"
                >
                    Button
                </Button>
            </div>
        </div>
    );
}
