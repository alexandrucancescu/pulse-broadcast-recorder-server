import { Entity, Column, PrimaryColumn } from 'typeorm'

@Entity('recording')
export default class Recording {
	@PrimaryColumn()
	id: number

	@Column({ type: 'datetime', nullable: false })
	start: Date

	@Column({ type: 'datetime', nullable: false })
	end: Date

	@Column({ type: 'varchar', nullable: false })
	file: string

	@Column({ type: 'varchar', nullable: false })
	format: string
}
